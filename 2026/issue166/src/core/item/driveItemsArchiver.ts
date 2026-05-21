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
import * as Const from '../../common/const';
import { getFolderByPropertyKey_ } from '../../common/utils';
import { FileUtils } from '../../common/fileUtils';
import {
  DriveApiService,
  ListFilesOptions,
} from '../../common/driveApiService';
import { DriveItemQueryBuilder } from './driveItemQueryBuilder';
import { DrivePathResolver } from './drivePathResolver';
/**
 * 共有ドライブ内のアイテム（ファイル・フォルダ）階層をページネーションを考慮して抽出し、
 * 指定されたフォルダへJSONファイルとして分割保存（アーカイブ）するクラス。
 * * GASの実行制限（6分制限）を回避するため、実行時の進捗（ページトークン・バッチ番号）を
 * スクリプトプロパティに記憶し、次回実行時に途中から再開できる設計となっています。
 */
export class DriveItemsArchiver {
  // 進捗保存用のプロパティキーを追加
  private readonly PROP_PAGE_TOKEN = 'CURRENT_PAGE_TOKEN';
  private readonly PROP_BATCH_NUM = 'CURRENT_BATCH_NUMBER';

  private targetSharedDriveId: string;
  private targetSharedDriveName: string;
  private saveFolder: GoogleAppsScript.Drive.Folder;
  private storedPageToken: string | null;
  private storedBatchNumber: number;
  private readonly SLEEP_MS = 500;
  private readonly limitToFirstPage: boolean;
  /**
   * DriveItemsArchiver のインスタンスを初期化します。
   * スクリプトプロパティから必要な環境設定および前回実行時の進捗データを読み込みます。
   * * @param {string} driveName - 処理対象の共有ドライブ名（ログやファイル名に使用）
   * @param {boolean} [limitToFirstPage=false] - 最初の1ページのみで処理を終了させるかどうかのテストフラグ
   * @throws {Error} 必須となる対象ドライブIDのスクリプトプロパティが存在しない場合
   */
  constructor(driveName: string, limitToFirstPage = false) {
    this.limitToFirstPage = limitToFirstPage;
    const props = PropertiesService.getScriptProperties();
    this.saveFolder = getFolderByPropertyKey_(
      Const.PROPERTY_KEYS.JSON_FOLDER_ID
    );
    this.targetSharedDriveId =
      props.getProperty(Const.PROPERTY_KEYS.TARGET_SHARED_DRIVE_ID) || '';
    if (!this.targetSharedDriveId) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.TARGET_SHARED_DRIVE_ID} が設定されていません。スクリプトプロパティに共有ドライブ設定レポートの対象ドライブIDを設定してください。`
      );
    }
    this.targetSharedDriveName = driveName;
    // 保存されているページトークンとバッチ番号（ページ数）を読み込む
    this.storedPageToken = props.getProperty(this.PROP_PAGE_TOKEN);
    const savedBatchNum = props.getProperty(this.PROP_BATCH_NUM);
    this.storedBatchNumber = savedBatchNum ? parseInt(savedBatchNum, 10) : 1;
  }
  /**
   * 共有ドライブのアーカイブ処理を実行します。
   * 記憶された進捗情報がある場合は自動的に途中から処理を再開します。
   * @param {'ALL' | 'PERIOD' | 'RECENT_2_DAYS'} [filterMode=Const.FILTER_MODE.RECENT_2_DAYS] - 抽出対象とするアイテムの更新日フィルターモード
   * @throws {Error} 処理中に致命的なエラーが発生した場合
   */
  public execute(
    filterMode: 'ALL' | 'PERIOD' | 'RECENT_2_DAYS' = Const.FILTER_MODE
      .RECENT_2_DAYS
  ): void {
    const now = new Date();
    // 続きからの再開か、新規スタートかをログに出力
    if (this.storedPageToken) {
      console.log(
        `Drive [${this.targetSharedDriveId}] の処理をページトークン: ${this.storedPageToken} (バッチ: ${this.storedBatchNumber}) から再開します。`
      );
    } else {
      console.log(
        `Drive [${this.targetSharedDriveId}] の処理を新規に開始します。`
      );
    }
    try {
      // 引数の末尾にトークンとバッチ番号を追加して呼び出す
      this.processSingleDrive(
        now,
        this.storedPageToken || undefined,
        this.storedBatchNumber,
        filterMode
      );
      console.log(
        `Successfully processed batch segment for: ${this.targetSharedDriveId}`
      );
    } catch (e) {
      console.error(
        `Drive [${this.targetSharedDriveId}] の処理中にエラーが発生しました。現在の進捗は保存されています。エラー: ${e}`
      );
      throw e;
    }
  }
  /**
   * 対象共有ドライブのファイル・フォルダをページネーションしながら走査し、JSONファイルとして出力する内部主処理。
   * * @param {Date} date - 構築するJSONのファイル名に使用する基準日時
   * @param {string} [initialPageToken] - 検索を開始するページのトークン（再開時用）
   * @param {number} [initialBatchNumber=1] - 出力ファイル名に付与する開始バッチ（ページ）番号
   * @param {'ALL' | 'PERIOD' | 'RECENT_2_DAYS'} [filterMode=Const.FILTER_MODE.RECENT_2_DAYS] - クエリビルダに引き渡す抽出モード
   * @private
   */
  private processSingleDrive(
    date: Date,
    initialPageToken?: string, // 開始時のトークン
    initialBatchNumber = 1, // 開始時のバッチ番号,
    filterMode: 'ALL' | 'PERIOD' | 'RECENT_2_DAYS' = Const.FILTER_MODE
      .RECENT_2_DAYS
  ): void {
    let pageToken: string | undefined = initialPageToken;
    let batchNumber = initialBatchNumber;
    const props = PropertiesService.getScriptProperties();
    // パス解決用のインスタンスを生成
    const pathResolver = new DrivePathResolver();

    const queryBuilder = new DriveItemQueryBuilder();
    const baseQuery = queryBuilder.build(
      this.targetSharedDriveName,
      filterMode
    );

    const fields = `nextPageToken, files(id, name, parents, createdTime, mimeType, modifiedTime, permissionIds)`;
    do {
      const options: ListFilesOptions = {
        pageSize: 1000,
        q: baseQuery,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        corpora: 'drive',
        driveId: this.targetSharedDriveId,
        fields: fields,
        pageToken: pageToken,
      };

      const response: {
        files?: Const.ArchivedItem[] | undefined;
        nextPageToken?: string;
      } = DriveApiService.fetchFiles(options);

      const items: Const.ArchivedItem[] | undefined = response.files;
      if (this.handleEmptyResponse(items)) break;

      const enrichedItems = items?.map(item => {
        const parentPath = pathResolver.resolve(item);
        const type =
          item.mimeType === Const.MIME_TYPES.FOLDER
            ? Const.FOLDER_JP
            : Const.FILE_JP;
        return { ...item, parentPath, itemType: type };
      });

      const fileName = FileUtils.generateJsonFileName(
        Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM,
        this.targetSharedDriveName,
        batchNumber,
        date
      );
      const content = JSON.stringify(enrichedItems, null, 2);
      this.saveFolder.createFile(fileName, content, MimeType.PLAIN_TEXT);

      // 次のループ（ページ）のための準備
      batchNumber++;
      pageToken = response.nextPageToken;

      if (this.limitToFirstPage) break;

      // 1ページ出力するごとに、次のページの情報をプロパティに保存（上書き）する
      if (pageToken) {
        this.saveProgress(props, pageToken, batchNumber);
        Utilities.sleep(this.SLEEP_MS);
      }
    } while (pageToken);

    // ループを抜けた ＝ 次のページがない（すべての処理が正常終了した）場合
    if (!pageToken) {
      this.clearProgress(props);
    }

    pathResolver.clear();
  }
  /**
   * 現在のページング進捗（トークンと次のバッチ番号）をスクリプトプロパティに保存します。
   * @param {GoogleAppsScript.Properties.Properties} props - スクリプトプロパティのインスタンス
   * @param {string} token - 次のデータページを指す nextPageToken
   * @param {number} batchNum - 次に出力されるファイルのバッチ番号
   * @private
   */
  private saveProgress(
    props: GoogleAppsScript.Properties.Properties,
    token: string,
    batchNum: number
  ): void {
    props.setProperties({
      [this.PROP_PAGE_TOKEN]: token,
      [this.PROP_BATCH_NUM]: batchNum.toString(),
    });
    console.log(
      `ページ ${batchNum - 1} の出力を保存しました。次のトークンを記憶しました。`
    );
  }

  /**
   * すべての処理が完了したため、スクリプトプロパティから進捗管理用のデータを削除します。
   * @param {GoogleAppsScript.Properties.Properties} props - スクリプトプロパティのインスタンス
   * @private
   */
  private clearProgress(props: GoogleAppsScript.Properties.Properties): void {
    props.deleteProperty(this.PROP_PAGE_TOKEN);
    props.deleteProperty(this.PROP_BATCH_NUM);
    console.log(
      `Drive [${this.targetSharedDriveId}] の全ページの出力が正常に完了したため、進捗プロパティをクリアしました。`
    );
  }

  /**
   * APIのレスポンスが空、またはアイテム数が0件だった場合のログ出力と離脱判定処理を行います。
   * @param {Const.ArchivedItem[] | undefined} items - APIレスポンスから得られたファイルアイテムの配列
   * @returns {boolean} 処理を中断（ブレイク）すべきである場合は true、続行する場合は false
   * @private
   */
  private handleEmptyResponse(
    items: Const.ArchivedItem[] | undefined
  ): boolean {
    if (!items) {
      console.warn(
        `Drive ID: ${this.targetSharedDriveId} からアイテムが取得できませんでした。`
      );
      return true;
    }
    if (items.length === 0) {
      console.log(
        `Drive ID: ${this.targetSharedDriveId} にアイテムが存在しません。`
      );
      return true;
    }
    return false;
  }
}

/**
 * 共有ドライブアイテムのアーカイブ処理のエントリーポイント関数。
 * 実行コンテキスト（内部ドライブか外部共有ドライブか）を自動的に判別し、最適な日付絞り込みモードで実行します。
 * @param {boolean} limitToFirstPage - 最初の1ページ（最大1000件）のみで終了させるかどうかのテスト用フラグ
 * @throws {Error} 取得したドライブ名がシステム定義外（予期せぬ名前）であった場合
 */
export const executeJsonArchivingProcess_ = (
  limitToFirstPage: boolean
): void => {
  const driveName = DriveApiService.fetchSharedDriveName();
  const props = PropertiesService.getScriptProperties();
  props.setProperty(Const.PROPERTY_KEYS.DRIVE_NAME, driveName);
  const mode =
    driveName === Const.SHARED_DRIVE_NAME.INTERNAL
      ? Const.FILTER_MODE.RECENT_2_DAYS
      : driveName === Const.SHARED_DRIVE_NAME.EXTERNAL
        ? Const.FILTER_MODE.ALL
        : undefined;
  if (!mode) {
    throw new Error(
      `予期せぬドライブ名が取得されました。ドライブ名: ${driveName}`
    );
  }
  new DriveItemsArchiver(driveName, limitToFirstPage).execute(mode);
};
