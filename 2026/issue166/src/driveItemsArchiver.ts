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
import { DateUtils } from './utils';
/**
 * DriveItemsArchiver.ts
 * 共有ドライブのフォルダ階層を抽出し、JSONとして保存。
 */
export class DriveItemsArchiver {
  private readonly PROP_SAVE_DEST = Const.PROPERTY_KEYS.JSON_FOLDER_ID;
  private readonly PROP_TARGET_DRIVES =
    Const.PROPERTY_KEYS.TARGET_SHARED_DRIVE_IDS;
  private readonly PROP_TODO = Const.PROPERTY_KEYS.TODO_DRIVE_IDS;
  private readonly PROP_DONE = Const.PROPERTY_KEYS.DONE_DRIVE_IDS;

  private saveFolderId: string;
  private targetSharedDriveIdsRaw: string;
  private todoDriveIds: string[];
  private doneDriveIds: string[];

  private readonly MAX_RETRIES = 3;
  private readonly SLEEP_MS = 500;
  // パス計算用のキャッシュ (ID -> フルパス)
  private pathCache: Map<string, string> = new Map();

  // テスト用フラグ
  // trueにすると最初の1ページ（最大1000件）のみ保存して終了します
  private readonly limitToFirstPage: boolean = true;

  constructor() {
    const props = PropertiesService.getScriptProperties();

    this.saveFolderId = this.getOrSetDefault(
      props,
      this.PROP_SAVE_DEST,
      'SET_YOUR_FOLDER_ID_HERE'
    );
    this.targetSharedDriveIdsRaw = this.getOrSetDefault(
      props,
      this.PROP_TARGET_DRIVES,
      'SET_DRIVE_ID_1,SET_DRIVE_ID_2'
    );

    const todoRaw: string = props.getProperty(this.PROP_TODO) || '';
    let doneRaw: string = props.getProperty(this.PROP_DONE) || '';
    // doneRawが"dummy"の場合は、初回実行後の状態なので、doneDriveIdsは空にする
    if (doneRaw === Const.DUMMY_VALUE) {
      doneRaw = '';
    }

    this.todoDriveIds = todoRaw
      ? todoRaw
          .split(',')
          .filter(Boolean)
          .map(id => id.trim())
      : [];
    this.doneDriveIds = doneRaw
      ? doneRaw
          .split(',')
          .filter(Boolean)
          .map(id => id.trim())
      : [];
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

  public initQueue(): void {
    this.validateAndThrow();
    const props = PropertiesService.getScriptProperties();
    props.setProperty(this.PROP_TODO, this.targetSharedDriveIdsRaw);
    props.setProperty(this.PROP_DONE, Const.DUMMY_VALUE); // 空だと他のプロパティを登録する際にエラーになる
    console.log('キューの初期化が完了しました。');
  }

  public executeNext(): void {
    this.validateAndThrow();

    if (this.todoDriveIds.length === 0) {
      console.log('TODOリストが空です。全ての処理が完了しています。');
      return;
    }

    const currentDriveId = this.todoDriveIds.shift() as string;
    const saveFolder = DriveApp.getFolderById(this.saveFolderId);
    const now = new Date();

    try {
      this.processSingleDrive(currentDriveId, saveFolder, now);
      this.doneDriveIds.push(currentDriveId);
      this.updateStatus();
      console.log(`Successfully archived: ${currentDriveId}`);
    } catch (e) {
      this.updateStatus();
      throw new Error(
        `Drive [${currentDriveId}] の処理中にエラーが発生しました: ${e}`
      );
    }
  }

  private processSingleDrive(
    driveId: string,
    saveFolder: GoogleAppsScript.Drive.Folder,
    date: Date
  ): void {
    let pageToken: string | undefined = undefined;
    let batchNumber = 1;
    const driveName = this.getSharedDriveName(driveId);
    this.pathCache.set(driveId, driveName);

    do {
      const response: {
        files?: Const.ArchivedItem[] | undefined;
        nextPageToken?: string;
      } = this.fetchItems(driveId, pageToken);
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
        const fullPath = this.resolveFullPath(item);

        const type =
          item.mimeType === Const.MIME_TYPES.FOLDER
            ? Const.FOLDER_JP
            : Const.FILE_JP;

        return {
          ...item,
          fullPath: fullPath,
          itemType: type,
        };
      });

      const fileName = this.generateFileName(driveName, batchNumber, date);
      const content = JSON.stringify(enrichedItems, null, 2);
      saveFolder.createFile(fileName, content, MimeType.PLAIN_TEXT);
      batchNumber++;

      if (this.limitToFirstPage) break;
      pageToken = response.nextPageToken;
      if (pageToken) Utilities.sleep(this.SLEEP_MS);
    } while (pageToken);

    this.pathCache.clear();
  }

  private fetchItems(
    driveId: string,
    pageToken?: string
  ): { files?: Const.ArchivedItem[]; nextPageToken?: string } {
    let retryCount = 0;
    const optionalArgs: {
      pageSize: number;
      q: string;
      supportsAllDrives: boolean;
      includeItemsFromAllDrives: boolean;
      corpora: string;
      driveId: string;
      fields: string;
      pageToken: string | undefined;
    } = {
      pageSize: 1000,
      q: 'trashed = false',
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: driveId,
      fields: 'nextPageToken, files(id, name, parents, createdTime, mimeType)',
      pageToken: pageToken,
    };

    while (retryCount < this.MAX_RETRIES) {
      try {
        const driveApi = (globalThis as any).Drive;
        const result = driveApi.Files.list(optionalArgs);
        if (!result) throw new Error('API response is null');
        return result;
      } catch (e) {
        retryCount++;
        if (retryCount >= this.MAX_RETRIES) throw e;
        Utilities.sleep(10000);
      }
    }
    throw new Error('API Max Retries Exceeded');
  }

  /**
   * 親を遡ってフルパスを構築する
   */
  private resolveFullPath(folder: any): string {
    const parentId =
      folder.parents && folder.parents.length > 0 ? folder.parents[0] : null;

    if (!parentId) return folder.name;

    // 親のパスが既にキャッシュにあれば、それに自分の名前を足すだけ
    if (this.pathCache.has(parentId)) {
      const path = `${this.pathCache.get(parentId)} / ${folder.name}`;
      this.pathCache.set(folder.id, path);
      return path;
    }

    // キャッシュにない場合、親の名前を取得して再帰的に構築（基本は上から順に取得されるため、ここに来ることは稀）
    try {
      const parentFolder: GoogleAppsScript.Drive.Folder =
        DriveApp.getFolderById(parentId);
      const parentPath = this.resolveFullPath({
        id: parentId,
        name: parentFolder.getName(),
        parents: parentFolder.getParents().hasNext()
          ? [parentFolder.getParents().next().getId()]
          : [],
      });
      const path = `${parentPath} / ${folder.name}`;
      this.pathCache.set(folder.id, path);
      return path;
    } catch (e) {
      return `Unknown / ${folder.name}`;
    }
  }

  /**
   * 共有ドライブの名称を取得する
   */
  private getSharedDriveName(driveId: string): string {
    try {
      const driveApi = (globalThis as any).Drive;
      const drive = driveApi.Drives.get(driveId);
      // 特殊文字をファイル名に使えないため、一部置換
      return drive.name.replace(/[\\/:*?"<>|]/g, '_');
    } catch (e) {
      console.warn(`Drive名取得失敗(ID: ${driveId}): ${e}`);
      return `UnknownDrive_${driveId.slice(-4)}`;
    }
  }

  // 引数を driveName に変更
  private generateFileName(
    driveName: string,
    batch: number,
    date: Date
  ): string {
    const dateStr = DateUtils.getFormattedDate(date, 'yyyyMMdd_HHmm');
    const part = batch.toString().padStart(3, '0');
    // ファイル名: フォルダ構成_ドライブ名_yyyyMMdd_HHmm_p001.json
    return `${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}_${driveName}_${dateStr}_p${part}.json`;
  }

  private updateStatus(): void {
    const props = PropertiesService.getScriptProperties();
    props.setProperties({
      [this.PROP_TODO]: this.todoDriveIds.join(','),
      [this.PROP_DONE]: this.doneDriveIds.join(','),
    });
  }

  private validateAndThrow(): void {
    const isDummy = (val: string) =>
      !val || val.includes('SET_YOUR_') || val.includes('SET_DRIVE_ID_');
    const missingKeys: string[] = [];

    if (isDummy(this.saveFolderId)) missingKeys.push(this.PROP_SAVE_DEST);
    if (isDummy(this.targetSharedDriveIdsRaw))
      missingKeys.push(this.PROP_TARGET_DRIVES);

    if (missingKeys.length > 0) {
      throw new Error(
        `[Configuration Error] 以下のプロパティを正しく設定してください: ${missingKeys.join(', ')}`
      );
    }
  }
}

export const setupQueue_ = () => new DriveItemsArchiver().initQueue();
export const runNextArchiving_ = () => new DriveItemsArchiver().executeNext();
