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
  private jsonFolderId: string | null;
  public jsonFolder: GoogleAppsScript.Drive.Folder;
  private inputSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  private workSheetName = Const.SHEET_NAME.PERMISSION_ARCHIVE_WORK;
  private readonly SLEEP_MS = 500;
  /**
   * PermissionArchiver のインスタンスを初期化します。
   * スクリプトプロパティから必要な環境設定（保存先フォルダID、出力先スプレッドシートID）を読み込みます。
   * * @throws {Error} 必須となるスクリプトプロパティの不足、またはスプレッドシートの展開に失敗した場合
   */
  constructor() {
    const props = PropertiesService.getScriptProperties();

    // インフラ準備
    this.jsonFolderId = props.getProperty(
      Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID
    );
    if (!this.jsonFolderId) {
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
    this.jsonFolder = getFolderById_(this.jsonFolderId);
    this.inputSpreadsheet = SpreadsheetApp.openById(outputSsId);
  }
  /**
   * 既存のJSONファイルが存在するか確認し、ファイル名のセットを取得します。
   * @description
   * JSONファイルが存在しない場合は新規取得対象、存在する場合はスプレッドシートの更新日時が
   * JSONファイルの更新日時より新しい場合に再取得対象とする判定のために、
   * すでにフォルダー内に存在する対象ファイルの名称一覧を収集します。
   * @private
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

    // 💡 マジックナンバーを排除するためのインデックス定数定義
    const COLUMN_INDEX = {
      ID: 0, // A列: アイテムID
      MODIFIED_TIME: 5, // F列: 最終更新日時
      EXCLUDE_CHECK: 6, // G列: 取得対象外判定
    };

    const data: string[][] = sheet.getDataRange().getValues();

    // 1行目はヘッダーの想定なのでスキップ
    const targetIds: string[][] = data
      .slice(1)
      // 💡 row[6] を row[COLUMN_INDEX.EXCLUDE_CHECK] に変更して可読性を向上
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
    const existingFileNameSet: Set<string> =
      this.getExistingPermissionFileNameSet();
    const outputIds: string[][] = [];

    targetIds.forEach(([id, modifiedTime]) => {
      const fileName = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_${id}.json`;
      if (!existingFileNameSet.has(fileName)) {
        console.log(`新規取得対象: ${id}`);
        outputIds.push([id]);
        return;
      }
      const fileIterator = this.jsonFolder.getFilesByName(fileName);
      if (!fileIterator.hasNext()) {
        console.log(`新規取得対象（ファイル不在）: ${id}`);
        outputIds.push([id]);
        return;
      }
      const jsonLastUpdated = fileIterator.next().getLastUpdated();

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
    const idsToProcess = allIds.slice(0, 200);
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
    const remainingIds = [...failedIds, ...allIds.slice(200)];
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
  public fetchPermissions(fileId: string): {
    kind: any;
    permissions: any;
  } {
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
