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
/**
 * 各アイテム（ファイル・フォルダ）の詳細なアクセス権限（パーミッション）情報を
 * Drive APIから取得し、JSONファイルとしてアーカイブ保存するクラス。
 */
export class PermissionArchiver {
  private jsonFolderId: string | null;
  public jsonFolder: GoogleAppsScript.Drive.Folder;
  /**
   * PermissionArchiver のインスタンスを初期化します。
   * スクリプトプロパティから必要な環境設定（保存先フォルダID）を読み込みます。
   * @throws {Error} 必須となるスクリプトプロパティの不足、またはフォルダの取得に失敗した場合
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

    this.jsonFolder = getFolderById_(this.jsonFolderId);
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
  /**
   * 指定されたファイルIDのパーミッション情報を取得し、JSONファイルとして保存します。
   * @param fileId 取得対象のファイルまたはフォルダのID
   * @param saveFolder 保存先のフォルダオブジェクト
   */
  public fetchPermissionsAndSave(
    fileId: string,
    saveFolder: GoogleAppsScript.Drive.Folder
  ): void {
    const permissionsData = this.fetchPermissions(fileId);
    const fileName = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_${fileId}.json`;
    FileUtils.saveAsJsonFile(fileName, permissionsData, saveFolder);
  }
}
