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
export class PermissionArchiver {
  private readonly PROP_JSON_FOLDER = 'SAVE_DESTINATION_FOLDER_ID';
  private jsonFolderId: string;

  constructor() {
    const props = PropertiesService.getScriptProperties();
    this.jsonFolderId = props.getProperty(this.PROP_JSON_FOLDER) || '';
    if (!this.jsonFolderId) {
      throw new Error(
        `プロパティ「${this.PROP_JSON_FOLDER}」に保存先フォルダIDが設定されていません。`
      );
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
  public getSaveFolder(): GoogleAppsScript.Drive.Folder {
    const jsonOutputFolder = DriveApp.getFolderById(this.jsonFolderId);
    if (!jsonOutputFolder) {
      throw new Error(
        `プロパティ「${this.PROP_JSON_FOLDER}」に設定されたフォルダIDが無効です。`
      );
    }
    return jsonOutputFolder;
  }
  // JSONファイルとして保存するためのユーティリティ関数
  public saveAsJsonFile(
    saveFolder: GoogleAppsScript.Drive.Folder,
    fileName: string,
    data: any
  ): void {
    const content = JSON.stringify(data, null, 2);
    saveFolder.createFile(fileName, content, MimeType.PLAIN_TEXT);
  }
  public fetchPermissionsAndSave(
    fileId: string,
    saveFolder: GoogleAppsScript.Drive.Folder
  ): void {
    const permissionsData = this.fetchPermissions(fileId);
    const fileName = `permissions_${fileId}.json`;
    this.saveAsJsonFile(saveFolder, fileName, permissionsData);
  }
}
/**
 * デバッグ用エントリーポイント：単一IDの権限をJSON出力
 */
export const debugFetchPermissions_ = (testId = 'YOUR_TEST_ID_HERE'): void => {
  const permissionArchiver = new PermissionArchiver();
  const saveFolder = permissionArchiver.getSaveFolder();
  permissionArchiver.fetchPermissionsAndSave(testId, saveFolder);
};
