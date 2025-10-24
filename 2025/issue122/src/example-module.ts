/**
 * Copyright 2023 Google LLC
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
export function hello() {
  return 'Hello Apps Script!';
}
export function exportFolderPermissions_() {
  const folderId =
    PropertiesService.getScriptProperties().getProperty('TARGET_FOLDER_ID');
  if (!folderId) {
    throw new Error('TARGET_FOLDER_ID is not set in Script Properties.');
  }
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheets()[0];
  sheet.clearContents();

  const outputValues = [];
  const headers = [
    'タイプ',
    '名前',
    'ID',
    'URL',
    '共有アクセス',
    'パーミッション',
    'オーナー',
    '編集者',
    '閲覧者',
  ];
  outputValues.push(headers);
  const folder = DriveApp.getFolderById(folderId);

  // フォルダ直下のファイル
  const files = folder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    /*
    const name = file.getName();
    const id = file.getId();
    const url = file.getUrl();
    const accessClass = file.getSharingAccess(); // クラス (例 ANYONE_WITH_LINK, etc) :contentReference[oaicite:3]{index=3}
    const perm = file.getSharingPermission(); // 権限レベル (例 VIEW, EDIT) :contentReference[oaicite:4]{index=4}
    const owner = file.getOwner().getEmail();
    const editors = file
      .getEditors()
      .map(e => e.getEmail())
      .join('\n');
    const viewers = file
      .getViewers()
      .map(v => v.getEmail())
      .join('\n');

    outputValues.push([
      'ファイル',
      name,
      id,
      url,
      accessClass,
      perm,
      owner,
      editors,
      viewers,
    ]);
    */
    const info = getDataInformation_(file);
    outputValues.push(['ファイル', ...info]);
  }
  // フォルダ直下のフォルダ（サブフォルダ）は、再帰しない直下分のみ
  const subfolders = folder.getFolders();
  while (subfolders.hasNext()) {
    const sub = subfolders.next();
    /*
    const name = sub.getName();
    const id = sub.getId();
    const url = sub.getUrl();
    const accessClass = sub.getSharingAccess(); // フォルダの共有クラス
    const perm = sub.getSharingPermission(); // フォルダの許可レベル
    const owner = sub.getOwner().getEmail();
    const editors = sub
      .getEditors()
      .map(e => e.getEmail())
      .join(', ');
    const viewers = sub
      .getViewers()
      .map(v => v.getEmail())
      .join(', ');
    outputValues.push([
      'フォルダ',
      name,
      id,
      url,
      accessClass,
      perm,
      owner,
      editors,
      viewers,
    ]);*/
    const info = getDataInformation_(sub);
    outputValues.push(['フォルダ', ...info]);
  }
  sheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}
function getDataInformation_(
  data: GoogleAppsScript.Drive.File | GoogleAppsScript.Drive.Folder
): string[] {
  const name = data.getName();
  const id = data.getId();
  const url = data.getUrl();
  const accessClass = String(data.getSharingAccess()); // クラス (例 ANYONE_WITH_LINK, etc) :contentReference[oaicite:3]{index=3}
  const perm = String(data.getSharingPermission()); // 権限レベル (例 VIEW, EDIT) :contentReference[oaicite:4]{index=4}
  const owner = data.getOwner().getEmail();
  const editors = data
    .getEditors()
    .map(e => e.getEmail())
    .join('\n');
  const viewers = data
    .getViewers()
    .map(v => v.getEmail())
    .join('\n');
  return [name, id, url, accessClass, perm, owner, editors, viewers];
}
