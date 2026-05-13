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
/**
 * FolderArchiver.ts
 * 共有ドライブのフォルダ階層を抽出し、JSONとして保存。
 */

export class FolderArchiver {
  private readonly PROP_SAVE_DEST = 'SAVE_DESTINATION_FOLDER_ID';
  private readonly PROP_TARGET_DRIVES = 'TARGET_SHARED_DRIVE_IDS';
  private readonly PROP_TODO = 'TODO_DRIVE_IDS';
  private readonly PROP_DONE = 'DONE_DRIVE_IDS';

  private saveFolderId: string;
  private targetSharedDriveIdsRaw: string;
  private todoDriveIds: string[];
  private doneDriveIds: string[];

  private readonly MAX_RETRIES = 3;
  private readonly SLEEP_MS = 500;

  // --- 追加: テスト用フラグ ---
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

    const todoRaw = props.getProperty(this.PROP_TODO) || '';
    const doneRaw = props.getProperty(this.PROP_DONE) || '';

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
    props.setProperty(this.PROP_DONE, '');
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

    do {
      const response: { files?: any[]; nextPageToken?: string } =
        this.fetchFolders(driveId, pageToken);
      const folders = response.files;

      if (folders && folders.length > 0) {
        const fileName = this.generateFileName(driveId, batchNumber, date);
        const content = JSON.stringify(folders, null, 2);
        saveFolder.createFile(fileName, content, MimeType.PLAIN_TEXT);
        batchNumber++;
      }

      // --- 修正箇所: フラグ判定を追加 ---
      if (this.limitToFirstPage) {
        console.log('[Test Mode] 最初の1ページのみ保存して終了します。');
        break;
      }

      pageToken = response.nextPageToken;
      if (pageToken) Utilities.sleep(this.SLEEP_MS);
    } while (pageToken);
  }

  private fetchFolders(
    driveId: string,
    pageToken?: string
  ): { files?: any[]; nextPageToken?: string } {
    let retryCount = 0;
    const optionalArgs: any = {
      pageSize: 1000,
      q: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      corpora: 'drive',
      driveId: driveId,
      fields: 'nextPageToken, files(id, name, parents, createdTime)',
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

  private generateFileName(driveId: string, batch: number, date: Date): string {
    const dateStr = Utilities.formatDate(date, 'JST', 'yyyyMMdd_HHmm');
    const suffix = driveId.slice(-4);
    const part = batch.toString().padStart(3, '0');
    return `folder_hierarchy_id-${suffix}_${dateStr}_p${part}.json`;
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

export const setupQueue_ = () => new FolderArchiver().initQueue();
export const runNextArchiving_ = () => new FolderArchiver().executeNext();
