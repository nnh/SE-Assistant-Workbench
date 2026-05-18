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
  private workSheetName = Const.SHEET_NAME.PERMISSION_ARCHIVE_WORK;

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
   * 既存のJSONファイルが存在するか確認し、ファイル名のセットを取得します。
   * * @description
   * JSONファイルが存在しない場合は新規取得対象、存在する場合はスプレッドシートの更新日時が
   * JSONファイルの更新日時より新しい場合に再取得対象とする判定のために、
   * すでにフォルダー内に存在する対象ファイルの名称一覧を収集します。
   * * @private
   * @returns {Set<string>} 既存のJSONファイル名のセット
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
  /**
   * フォルダ構成シートからパーミッション取得対象のIDを取得します。
   * * @description
   * 指定されたシートからIDと最終更新日時を取得し、取得対象のIDを抽出します。
   * * @private
   * @returns {string[][]} 取得対象のIDと最終更新日時の配列
   */
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
  /**
   * パーミッション取得対象のIDをスプレッドシートに出力します。
   * * @description
   * 取得対象のIDが存在する場合は、指定されたシートに出力します。
   * 指定シート名は「作業用_パーミッション未取得IDリスト」とし、前回の内容はクリアしてから出力します。
   * * @public
   */
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
   * 作業用_パーミッション未取得IDリストシートからIDを取得し、パーミッション情報をJSONファイルとして保存します。
   * * @description
   * 作業用_パーミッション未取得IDリストシートからIDを取得し、Drive APIを使用して各IDのパーミッション情報を取得します。
   * 作業用_パーミッション未取得IDリストシートの最後の行から1行目に向かってループを回し、IDを取得していきます。
   * JSONファイルを取得したら、そのIDをシートから削除していきます。一度の処理につき、１０件まで取得することとします。
   * 取得した情報はJSONファイルとして保存します。ファイル名は「permission_{ID}.json」とし、保存先はプロパティで指定されたフォルダとします。
   * * @public
   */
  public fetchPermissionsAndSaveForTargetIds(): void {
    const workSheet = this.inputSpreadsheet.getSheetByName(this.workSheetName);
    if (!workSheet) {
      throw new Error(
        `スプレッドシートに「${this.workSheetName}」シートが見つかりません。`
      );
    }
    const lastRow = workSheet.getLastRow();
    if (lastRow === 0) {
      console.log('取得対象がありませんでした。');
      return;
    }
    const targetIds: string[][] = workSheet
      .getRange(1, 1, lastRow, 1)
      .getValues() as string[][];
    const idsToProcess = targetIds.slice(0, 100); // 一度に処理する件数を100件に制限
    idsToProcess.forEach(([id], index) => {
      try {
        const permissionsData = this.fetchPermissions(id);
        const fileName = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_${id}.json`;
        this.saveAsJsonFile(fileName, permissionsData, this.jsonFolder);
        // 処理が成功したIDはシートから削除
        workSheet.getRange(index + 1, 1).clearContent(); // IDをクリア
      } catch (e) {
        console.error(`ID: ${id} の処理中にエラーが発生しました: ${e}`);
        // エラーが発生しても処理を続行するため、ここでは何もしない
      }
    });
    const outputValues: string[][] = workSheet
      .getDataRange()
      .getValues()
      .filter((row: string[]) => row[0] !== ''); // 空の行を除外
    if (outputValues.length > 0) {
      workSheet.clear(); // シートをクリア
      workSheet.getRange(1, 1, outputValues.length, 1).setValues(outputValues); // 残ったIDを上に詰める
    }
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

export const archivePermissionsForTargetIds_ = (): void => {
  const permissionArchiver = new PermissionArchiver();
  permissionArchiver.archivePermissionsForTargetIds();
};
export const fetchPermissionsAndSaveForTargetIds_ = (): void => {
  const permissionArchiver = new PermissionArchiver();
  permissionArchiver.fetchPermissionsAndSaveForTargetIds();
};
