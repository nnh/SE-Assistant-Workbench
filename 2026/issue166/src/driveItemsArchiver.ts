/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import * as Const from './const';
import { getFolderById_ } from './utils';
import { FileUtils } from './fileUtils';
import { DriveApiService, ListFilesOptions } from './driveApiService';
/**
 * DriveItemsArchiver.ts
 * 共有ドライブのフォルダ階層を抽出し、JSONとして保存。
 */
export class DriveItemsArchiver {
  private readonly PROP_SAVE_DEST = Const.PROPERTY_KEYS.JSON_FOLDER_ID;
  private readonly PROP_TARGET_DRIVES =
    Const.PROPERTY_KEYS.TARGET_SHARED_DRIVE_ID;
  // 進捗保存用のプロパティキーを追加
  private readonly PROP_PAGE_TOKEN = 'CURRENT_PAGE_TOKEN';
  private readonly PROP_BATCH_NUM = 'CURRENT_BATCH_NUMBER';

  private targetSharedDriveId: string;
  private saveFolderId: string;
  private saveFolder: GoogleAppsScript.Drive.Folder;
  private storedPageToken: string | null;
  private storedBatchNumber: number;
  private readonly SLEEP_MS = 500;
  // パス計算用のキャッシュ (ID -> フルパス)
  private pathCache: Map<string, string> = new Map();

  // テスト用フラグ
  // trueにすると最初の1ページ（最大1000件）のみ保存して終了します
  private readonly limitToFirstPage: boolean = false;

  constructor() {
    const props = PropertiesService.getScriptProperties();

    const saveFolderId = this.getOrSetDefault(
      props,
      this.PROP_SAVE_DEST,
      'SET_YOUR_FOLDER_ID_HERE'
    );
    this.saveFolder = getFolderById_(saveFolderId);
    this.saveFolderId = saveFolderId;
    this.targetSharedDriveId = this.getOrSetDefault(
      props,
      this.PROP_TARGET_DRIVES,
      'SET_YOUR_SHARED_DRIVE_ID_HERE'
    );
    // 保存されているページトークンとバッチ番号（ページ数）を読み込む
    this.storedPageToken = props.getProperty(this.PROP_PAGE_TOKEN);
    const savedBatchNum = props.getProperty(this.PROP_BATCH_NUM);
    this.storedBatchNumber = savedBatchNum ? parseInt(savedBatchNum, 10) : 1;
  }

  private getOrSetDefault(
    props: GoogleAppsScript.Properties.Properties,
    key: string,
    defaultValue: string
  ): string {
    const val = props.getProperty(key);
    if (val === null) {
      props.setProperty(key, defaultValue);
      console.warn(
        `Missing Property Created: [${key}]. Please set the actual ID.`
      );
      return defaultValue;
    }
    return val;
  }

  public execute(): void {
    this.validateAndThrow();

    const now = new Date();
    const driveId = this.targetSharedDriveId;
    // 続きからの再開か、新規スタートかをログに出力
    if (this.storedPageToken) {
      console.log(
        `Drive [${driveId}] の処理をページトークン: ${this.storedPageToken} (バッチ: ${this.storedBatchNumber}) から再開します。`
      );
    } else {
      console.log(`Drive [${driveId}] の処理を新規に開始します。`);
    }
    try {
      // 💡 引数の末尾にトークンとバッチ番号を追加して呼び出す
      this.processSingleDrive(
        driveId,
        this.saveFolder,
        now,
        this.storedPageToken || undefined,
        this.storedBatchNumber
      );
      console.log(`Successfully processed batch segment for: ${driveId}`);
    } catch (e) {
      console.error(
        `Drive [${driveId}] の処理中にエラーが発生しました。現在の進捗は保存されています。エラー: ${e}`
      );
      throw e;
    }
  }

  private processSingleDrive(
    driveId: string,
    saveFolder: GoogleAppsScript.Drive.Folder,
    date: Date,
    initialPageToken?: string, // 💡 追加：開始時のトークン
    initialBatchNumber = 1 // 💡 追加：開始時のバッチ番号
  ): void {
    let pageToken: string | undefined = initialPageToken;
    let batchNumber = initialBatchNumber;

    const driveName = DriveApiService.fetchSharedDriveName(driveId);
    // ドライブ名をプロパティにセットする
    const props = PropertiesService.getScriptProperties();
    props.setProperty(Const.PROPERTY_KEYS.DRIVE_NAME, driveName);
    this.pathCache.set(driveId, driveName);

    const queryParts: string[] = ['trashed = false'];
    // 今日から1年前の日付を計算し、API用のフォーマット（RFC 3339）に変換する
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    // GASの Utilities.formatDate を使って「YYYY-MM-DDTHH:mm:ssZ」形式にする
    const formattedOneYearAgo = Utilities.formatDate(
      oneYearAgo,
      'GMT',
      "yyyy-MM-dd'T'HH:mm:ss'Z'"
    );
    if (driveName === Const.SHARED_DRIVE_NAME.INTERNAL) {
      // フォルダのみ抽出する場合
      /*
      queryParts.push(`mimeType = '${Const.MIME_TYPES.FOLDER}'`);
      console.log(
        `[Query Settings] ${driveName} は【フォルダのみ】を抽出対象にします。`
      );*/
      queryParts.push(`modifiedTime > '${formattedOneYearAgo}'`);
      console.log(
        `[Query Settings] ${driveName} は【1年以内に更新されたアイテムのみ】を抽出対象にします。`
      );
    } else {
      console.log(
        `[Query Settings] ${driveName} は【ファイルとフォルダ両方】を抽出対象にします。`
      );
    }

    // 配列に溜まった条件を ' and ' で結合する（例: "trashed = false and mimeType = '...'"）
    const baseQuery = queryParts.join(' and ');

    do {
      const options: ListFilesOptions = {
        pageSize: 1000,
        q: baseQuery,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: driveId,
        fields:
          'nextPageToken, files(id, name, parents, createdTime, mimeType, modifiedTime)',
        pageToken: pageToken,
      };

      const response: {
        files?: Const.ArchivedItem[] | undefined;
        nextPageToken?: string;
      } = DriveApiService.fetchFiles(options);

      const items: Const.ArchivedItem[] | undefined = response.files;
      if (!items) {
        console.warn(
          `Drive ID: ${driveId} からアイテムが取得できませんでした。`
        );
        break;
      }
      if (items.length === 0) {
        console.log(`Drive ID: ${driveId} にアイテムが存在しません。`);
        break;
      }

      const enrichedItems = items.map(item => {
        const parentPath = this.resolveParentPath(item);
        const type =
          item.mimeType === Const.MIME_TYPES.FOLDER
            ? Const.FOLDER_JP
            : Const.FILE_JP;
        return { ...item, parentPath, itemType: type };
      });

      const fileName = FileUtils.generateJsonFileName(
        Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM,
        driveName,
        batchNumber,
        date
      );
      const content = JSON.stringify(enrichedItems, null, 2);
      saveFolder.createFile(fileName, content, MimeType.PLAIN_TEXT);

      // 💡 次のループ（ページ）のための準備
      batchNumber++;
      pageToken = response.nextPageToken;

      if (this.limitToFirstPage) break;

      // 💡 1ページ出力するごとに、次のページの情報をプロパティに保存（上書き）する
      if (pageToken) {
        props.setProperties({
          [this.PROP_PAGE_TOKEN]: pageToken,
          [this.PROP_BATCH_NUM]: batchNumber.toString(),
        });
        console.log(
          `ページ ${batchNumber - 1} の出力を保存しました。次のトークンを記憶しました。`
        );
        Utilities.sleep(this.SLEEP_MS);
      }
    } while (pageToken);

    // 💡 ループを抜けた ＝ 次のページがない（すべての処理が正常終了した）場合
    if (!pageToken) {
      props.deleteProperty(this.PROP_PAGE_TOKEN);
      props.deleteProperty(this.PROP_BATCH_NUM);
      console.log(
        `Drive [${driveId}] の全ページの出力が正常に完了したため、進捗プロパティをクリアしました。`
      );
    }

    this.pathCache.clear();
  }
  /**
   * アイテムが存在する「親フォルダ」のフルパスを構築する
   */
  private resolveParentPath(folder: any): string {
    const parentId =
      folder.parents && folder.parents.length > 0 ? folder.parents[0] : null;

    // 親がいない（ドライブ直下など）場合は空文字、またはドライブ名のみにする
    if (!parentId) return '';

    // 親のパスが既にキャッシュにあればそれを返す
    if (this.pathCache.has(parentId)) {
      return this.pathCache.get(parentId) as string;
    }

    // キャッシュにない場合（再帰的に親を辿る）
    try {
      const parentFolder: GoogleAppsScript.Drive.Folder =
        DriveApp.getFolderById(parentId);

      // 親自身のフルパスを構築
      const parentName = parentFolder.getName();
      const grandParentId = parentFolder.getParents().hasNext()
        ? parentFolder.getParents().next().getId()
        : null;

      // 再帰呼び出し：親の親のパス + 親の名前
      const grandParentPath = this.resolveParentPath({
        id: parentId,
        name: parentName,
        parents: grandParentId ? [grandParentId] : [],
      });

      const fullParentPath = grandParentPath
        ? `${grandParentPath} / ${parentName}`
        : parentName;

      // キャッシュに保存
      this.pathCache.set(parentId, fullParentPath);
      return fullParentPath;
    } catch (e) {
      return 'Unknown';
    }
  }

  private validateAndThrow(): void {
    const isDummy = (val: string) =>
      !val || val.includes('SET_YOUR_') || val.includes('SET_DRIVE_ID_');
    const missingKeys: string[] = [];

    if (isDummy(this.saveFolderId)) missingKeys.push(this.PROP_SAVE_DEST);
    if (isDummy(this.targetSharedDriveId))
      missingKeys.push(this.PROP_TARGET_DRIVES);

    if (missingKeys.length > 0) {
      throw new Error(
        `[Configuration Error] 以下のプロパティを正しく設定してください: ${missingKeys.join(', ')}`
      );
    }
  }
}

export const runNextArchiving_ = () => new DriveItemsArchiver().execute();
