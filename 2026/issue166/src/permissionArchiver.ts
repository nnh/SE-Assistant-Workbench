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
export class PermissionArchiver {
  private jsonFolderId: string;
  public jsonFolder: GoogleAppsScript.Drive.Folder;
  private inputSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  private workSheetName = '作業用_パーミッション未取得IDリスト';

  constructor() {
    const props = PropertiesService.getScriptProperties();

    // インフラ準備
    this.jsonFolderId =
      props.getProperty(Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID) || '';
    this.jsonFolder = this.getSaveFolder(this.jsonFolderId);

    const outputSsId =
      props.getProperty(Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID) || '';
    this.inputSpreadsheet = SpreadsheetApp.openById(outputSsId);
  }
  /**
   *
   * @returns
   */
  private getExistingPermissionFileNameSet(): Set<string> {
    const fileNamePrefix = Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION;
    const files = this.jsonFolder.getFiles();
    const existingFileNameSet = new Set<string>();
    while (files.hasNext()) {
      const file = files.next();
      if (file.getName().startsWith(`${fileNamePrefix}_`)) {
        existingFileNameSet.add(file.getName());
      }
    }
    return existingFileNameSet;
  }
  private getTargetIdsFromSpreadsheet(): string[][] {
    const sheetName = `${Const.SHARED_DRIVE_NAME.EXTERNAL}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
    const sheet = this.inputSpreadsheet.getSheetByName(sheetName);
    const index = {
      id: 0,
      modifiedTime: 5,
    };

    if (!sheet) {
      throw new Error(
        `スプレッドシートに「${sheetName}」シートが見つかりません。`
      );
    }
    const data: string[][] = sheet.getDataRange().getValues();
    // 1行目はヘッダーの想定なのでスキップ
    const targetIds: string[][] = data
      .slice(1)
      .map(row => [row[index.id], row[index.modifiedTime]])
      .filter(id => typeof id[0] === 'string' && typeof id[1] === 'string');
    return targetIds;
  }
  public archivePermissionsForTargetIds(): void {
    const workSheet = this.inputSpreadsheet.getSheetByName(this.workSheetName);
    if (!workSheet) {
      throw new Error(
        `スプレッドシートに「${this.workSheetName}」シートが見つかりません。`
      );
    }
    workSheet.clear(); // 前回の内容をクリア
    const targetIds: string[][] = this.getTargetIdsFromSpreadsheet();
    const existingFileNameSet: Set<string> =
      this.getExistingPermissionFileNameSet();
    const outputIds: string[][] = [];

    targetIds.forEach(([id, modifiedTime]) => {
      // JSONファイルが存在しない場合は必ず取得対象とする
      const fileName = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_${id}.json`;
      if (!existingFileNameSet.has(fileName)) {
        console.log(`新規取得対象: ${id}`);
        outputIds.push([id]);
        return;
      }
      const file = this.jsonFolder.getFilesByName(fileName).next();
      const jsonLastUpdated = file.getLastUpdated();

      // ファイルの更新日時がJSONより後の場合は取得対象とする
      const fileLastUpdated = new Date(modifiedTime);
      if (fileLastUpdated.getTime() > jsonLastUpdated.getTime()) {
        console.log(`更新あり。再取得対象: ${id}`);
        outputIds.push([id]);
      } else {
        console.log(`更新なし（スキップ）: ${id}`);
      }
    });
    if (outputIds.length === 0) {
      console.log('取得対象がありませんでした。');
      return;
    }
    // 取得対象がある場合はスプレッドシートに出力
    workSheet.getRange(1, 1, outputIds.length, 1).setValues(outputIds);
  }
  /**
   * パーミッション取得が必要かどうかを判定し、必要であれば取得して保存する
   * @param fileId 対象のファイル/フォルダID
   * @param fileLastUpdated 対象ファイルの最終更新日時
   */
  public archiveIfUpdated(fileId: string, fileLastUpdated: Date): void {
    console.log('0');
  }
  /**
   * Drive API V3 で詳細権限を取得
   */
  public fetchPermissions(fileId: string): {
    kind: any;
    permissions: any;
  } {
    const driveApi = (globalThis as any).Drive;
    if (!driveApi) throw new Error('Drive APIサービスを有効にしてください。');
    // https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions?hl=ja#Permission
    const fields =
      'permissions(id,displayName,type,permissionDetails,emailAddress,role,allowFileDiscovery,domain,deleted,view,inheritedPermissionsDisabled)';
    try {
      const permissionList = driveApi.Permissions.list(fileId, {
        supportsAllDrives: true,
        useDomainAdminAccess: false,
        fields: fields,
      });
      // permissionsが存在しない場合でも、構造を維持して返す
      return {
        kind: permissionList.kind || 'drive#permissionList',
        permissions: permissionList.permissions || [],
      };
    } catch (e) {
      console.error(`ID: ${fileId} の権限取得中にエラーが発生しました: ${e}`);
      // エラー時も一貫したJSON構造を返す
      return {
        kind: 'drive#permissionList',
        permissions: [],
      };
    }
  }
  public getSaveFolder(folderId: string): GoogleAppsScript.Drive.Folder {
    const jsonOutputFolder = DriveApp.getFolderById(folderId);
    if (!jsonOutputFolder) {
      throw new Error(
        `プロパティ「${folderId}」に設定されたフォルダIDが無効です。`
      );
    }
    return jsonOutputFolder;
  }
  // JSONファイルとして保存するためのユーティリティ関数
  public saveAsJsonFile(
    fileName: string,
    data: any,
    saveFolder: GoogleAppsScript.Drive.Folder
  ): void {
    const content = JSON.stringify(data, null, 2);
    saveFolder.createFile(fileName, content, MimeType.PLAIN_TEXT);
  }
  public fetchPermissionsAndSave(
    fileId: string,
    saveFolder: GoogleAppsScript.Drive.Folder
  ): void {
    const permissionsData = this.fetchPermissions(fileId);
    const fileName = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_${fileId}.json`;
    this.saveAsJsonFile(fileName, permissionsData, saveFolder);
  }
}

/**
 * デバッグ用エントリーポイント：単一IDの権限をJSON出力
 */
export const debugFetchPermissions_ = (testId = 'YOUR_TEST_ID_HERE'): void => {
  const permissionArchiver = new PermissionArchiver();
  permissionArchiver.fetchPermissionsAndSave(
    testId,
    permissionArchiver.jsonFolder
  );
};
