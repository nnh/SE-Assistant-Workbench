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
import { safeGet_ } from './utils';
import * as consts from './consts';
/**
 * スクリプトプロパティからルートフォルダのIDを取得し、Folderオブジェクトを返します。
 * @returns {GoogleAppsScript.Drive.Folder} 指定されたルートフォルダ
 * @throws {Error} TARGET_FOLDER_ID が設定されていない場合
 */
export const getRootFolder_ = () => {
  const folderId = PropertiesService.getScriptProperties().getProperty(
    consts.PROP_KEY.TARGET_FOLDER_ID
  );
  if (!folderId) {
    throw new Error(
      `${consts.PROP_KEY.TARGET_FOLDER_ID} is not set in Script Properties.`
    );
  }
  return DriveApp.getFolderById(folderId);
};

/**
 * 「対象外フォルダ」シートから除外したいフォルダIDの一覧を取得します。
 * @returns {Set<string>} フォルダIDのセット
 */
export const getExcludeFolderIds_ = (): Set<string> => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(consts.SHEET_NAME.EXCLUDE);
  if (!sheet) return new Set();

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return new Set();

  // A列の2行目からIDを取得
  const ids: string[] = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .flat();
  return new Set(ids.filter(id => id && typeof id === 'string'));
};

/**
 * フォルダまたはファイルから情報を抽出し、配列として返します。
 * @param {GoogleAppsScript.Drive.Folder | GoogleAppsScript.Drive.File} data - 取得対象のオブジェクト
 * @returns {(string | number | boolean)[]} 抽出された情報の配列（名前、ID、URL、アクセス権限、編集/閲覧者、ショートカット情報など）
 */
export const getDataInformation_ = (
  data: GoogleAppsScript.Drive.Folder | GoogleAppsScript.Drive.File
): (string | number | boolean)[] => {
  const name = data.getName();
  const id = data.getId();
  const url = data.getUrl();

  const accessClass = safeGet_(() => String(data.getSharingAccess()));
  const perm = safeGet_(() => String(data.getSharingPermission()));
  const owner = safeGet_(() => data.getOwner()?.getEmail() ?? '');

  const editors = safeGet_(() =>
    data
      .getEditors()
      .map((e: GoogleAppsScript.Base.User) => e.getEmail())
      .join('\n')
  );

  const viewers = safeGet_(() =>
    data
      .getViewers()
      .map((v: GoogleAppsScript.Base.User) => v.getEmail())
      .join('\n')
  );

  const shortcutFolderId = safeGet_(() => {
    try {
      const targetFile = DriveApp.getFileById(data.getId());
      const mimeType = targetFile.getMimeType();

      if (mimeType !== consts.MIME_TYPE.SHORTCUT) {
        return '';
      }

      return targetFile.getTargetId() ?? '';
    } catch {
      return '';
    }
  });

  return [
    name,
    id,
    url,
    accessClass,
    perm,
    owner,
    editors,
    viewers,
    shortcutFolderId,
  ];
};
