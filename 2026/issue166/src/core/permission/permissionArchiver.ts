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
import { getFolderById_ } from '../../common/utils';
import { FileUtils } from '../../common/fileUtils';
import { DriveApiService } from '../../common/driveApiService';
/**
 * 各アイテム（ファイル・フォルダ）の詳細なアクセス権限（パーミッション）情報を
 * Drive APIから取得し、JSONファイルとしてアーカイブ保存するクラス。
 * * GASの実行制限時間を考慮し、「差分のある対象IDのリスト化（ワークシート出力）」と
 * 「リストに基づいた小分けのAPI取得実行」の2フェーズに処理を分離しています。
 */
export class PermissionArchiver {
  public jsonFolder: GoogleAppsScript.Drive.Folder;
  private inputSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  private workSheetName = Const.SHEET_NAME.PERMISSION_ARCHIVE_WORK;
  private readonly SLEEP_MS = 500;
  private readonly BATCH_SIZE = 200;
  /**
   * PermissionArchiver のインスタンスを初期化します。
   * スクリプトプロパティから必要な環境設定（保存先フォルダID、出力先スプレッドシートID）を読み込みます。
   * * @throws {Error} 必須となるスクリプトプロパティの不足、またはスプレッドシートの展開に失敗した場合
   */
  constructor() {
    const props = PropertiesService.getScriptProperties();

    const jsonFolderId = props.getProperty(
      Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID
    );
    if (!jsonFolderId) {
      props.setProperty(
        Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID,
        'SET_YOUR_PERMISSION_JSON_FOLDER_ID_HERE'
      );
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID} が設定されていません。スクリプトプロパティにアクセス権限JSONの保存先フォルダIDを設定してください。`
      );
    }

    const outputSsId = props.getProperty(
      Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
    );
    if (!outputSsId) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID} が設定されていません。スクリプトプロパティに出力先スプレッドシートIDを設定してください。`
      );
    }
    this.jsonFolder = getFolderById_(jsonFolderId);
    this.inputSpreadsheet = SpreadsheetApp.openById(outputSsId);
  }
  /**
   * 既存のJSONファイルをスキャンし、ファイル名と最終更新日時のマップを取得します。
   * @description
   * フォルダを一度だけ走査して全ファイルの最終更新日時を収集します。
   * これにより、差分判定ループ内での追加API呼び出し（N+1問題）を防ぎます。
   * @private
   * @returns {Map<string, GoogleAppsScript.Base.Date>} ファイル名をキー、最終更新日時を値とするMap
   */
  private getExistingPermissionFileMap(): Map<
    string,
    GoogleAppsScript.Base.Date
  > {
    const prefix = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_`;
    const files = this.jsonFolder.getFiles();
    const fileMap = new Map<string, GoogleAppsScript.Base.Date>();
    while (files.hasNext()) {
      const file = files.next();
      const name = file.getName();
      if (name.startsWith(prefix)) {
        fileMap.set(name, file.getLastUpdated());
      }
    }
    return fileMap;
  }
  /**
   * フォルダ構成シートからパーミッション取得対象のIDを取得します。
   * @private
   * @returns {string[][]} 取得対象のIDと最終更新日時の配列
   */
  private getTargetIdsFromSpreadsheet(): string[][] {
    const driveName = PropertiesService.getScriptProperties().getProperty(
      Const.PROPERTY_KEYS.DRIVE_NAME
    );
    if (!driveName) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.DRIVE_NAME} が設定されていません。`
      );
    }
    const sheetName = `${driveName}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
    const sheet = this.inputSpreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(
        `スプレッドシートに「${sheetName}」シートが見つかりません。`
      );
    }

    const COLUMN_INDEX = {
      ID: 0, // A列: アイテムID
      MODIFIED_TIME: 5, // F列: 最終更新日時
      EXCLUDE_CHECK: 6, // G列: 取得対象外判定
    };

    const data: string[][] = sheet.getDataRange().getValues();

    const targetIds: string[][] = data
      .slice(1)
      .filter(
        row =>
          !row[COLUMN_INDEX.EXCLUDE_CHECK] ||
          row[COLUMN_INDEX.EXCLUDE_CHECK] === ''
      )
      .map(row => [row[COLUMN_INDEX.ID], row[COLUMN_INDEX.MODIFIED_TIME]])
      .filter(id => typeof id[0] === 'string' && typeof id[1] === 'string');

    return targetIds;
  }
  /**
   * パーミッション取得対象のIDをスプレッドシートに出力します。
   * @description
   * 取得対象のIDが存在する場合は、指定されたシートに出力します。
   * 指定シート名は「作業用_パーミッション未取得IDリスト」とし、前回の内容はクリアしてから出力します。
   * @public
   */
  public archivePermissionsForTargetIds(): void {
    let workSheet = this.inputSpreadsheet.getSheetByName(this.workSheetName);
    if (!workSheet) {
      workSheet = this.inputSpreadsheet.insertSheet(this.workSheetName);
    }
    workSheet.clearContents();

    const targetIds: string[][] = this.getTargetIdsFromSpreadsheet();
    const existingFileMap: Map<string, GoogleAppsScript.Base.Date> =
      this.getExistingPermissionFileMap();
    const outputIds: string[][] = [];

    targetIds.forEach(([id, modifiedTime]) => {
      const fileName = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_${id}.json`;
      const existingLastUpdated = existingFileMap.get(fileName);
      if (!existingLastUpdated) {
        console.log(`新規取得対象: ${id}`);
        outputIds.push([id]);
        return;
      }
      const fileLastUpdated = new Date(modifiedTime);
      if (fileLastUpdated.getTime() > existingLastUpdated.getTime()) {
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
    workSheet.getRange(1, 1, outputIds.length, 1).setValues(outputIds);
  }
  /**
   * 作業用ワークシートから未処理のIDリストを読み込み、パーミッション情報をJSONファイルとして保存します。
   * @description
   * 作業用ワークシートからIDを取得し、Drive APIを使用して各IDのパーミッション情報を取得します。
   * GASの実行制限時間を考慮し、一度の処理（1回のバッチ）につき最大200件まで取得・保存を行います。
   * JSONファイルの保存に成功したIDはシートから順次削除され、残ったIDは上に詰められます。
   * ファイル名は「permission_{ID}.json」とし、保存先はプロパティで指定されたフォルダとなります。
   * @public
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
    // 空行（途中タイムアウトで残ったクリア済み行）を除外して実際のIDのみを取得
    const allIds: string[] = workSheet
      .getRange(1, 1, lastRow, 1)
      .getValues()
      .flat()
      .filter(
        (id: unknown): id is string => typeof id === 'string' && id !== ''
      );
    if (allIds.length === 0) {
      workSheet.clear();
      return;
    }
    const idsToProcess = allIds.slice(0, this.BATCH_SIZE);
    const failedIds: string[] = [];
    idsToProcess.forEach((id, index) => {
      try {
        this.fetchPermissionsAndSave(id);
      } catch (e) {
        console.error(`ID: ${id} の処理中にエラーが発生しました: ${e}`);
        failedIds.push(id);
      }
      if (index < idsToProcess.length - 1) {
        Utilities.sleep(this.SLEEP_MS);
      }
    });
    const remainingIds = [...failedIds, ...allIds.slice(this.BATCH_SIZE)];
    workSheet.clear();
    if (remainingIds.length > 0) {
      workSheet
        .getRange(1, 1, remainingIds.length, 1)
        .setValues(remainingIds.map(id => [id]));
    }
  }
  /**
   * Drive API V3 で詳細権限を取得
   * @param fileId 取得対象のファイルまたはフォルダのID
   * @returns パーミッション情報のオブジェクト
   * @description
   * Drive API V3 の Permissions.list メソッドを使用して、指定されたファイルIDのパーミッション情報を取得します。
   * 取得するフィールドは、id, displayName, type, permissionDetails, emailAddress, role, allowFileDiscovery, domain, deleted, view, inheritedPermissionsDisabled です。
   * 取得に失敗した場合はエラーログを出力し、空のパーミッションリストを返します。
   * なお、このメソッドは Drive API サービスが有効になっていることが前提です。
   */
  public fetchPermissions(fileId: string): Const.PermissionResponse {
    // https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions?hl=ja#Permission
    const fields =
      'permissions(id,displayName,type,permissionDetails,emailAddress,role,allowFileDiscovery,domain,deleted,view,inheritedPermissionsDisabled)';
    return DriveApiService.fetchPermissions(fileId, {
      supportsAllDrives: true,
      useDomainAdminAccess: false,
      fields,
    });
  }
  /**
   * 指定されたファイルIDのパーミッション情報を取得し、JSONファイルとして保存します。
   * @param fileId 取得対象のファイルまたはフォルダのID
   * @param saveFolder 保存先のフォルダオブジェクト
   */
  public fetchPermissionsAndSave(fileId: string): void {
    const permissionsData = this.fetchPermissions(fileId);
    const fileName = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_${fileId}.json`;
    FileUtils.saveAsJsonFile(fileName, permissionsData, this.jsonFolder);
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
