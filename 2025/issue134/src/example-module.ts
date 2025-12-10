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
export function hello() {
  return 'Hello Apps Script!';
}
/**
 * 指定したフォルダIDのフォルダから指定したフォルダIDのフォルダに全てのファイルを移動する
 */
export function moveAllFilesBetweenFolders_() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const sourceFolderId = scriptProperties.getProperty('SOURCE_FOLDER_ID');
  const destFolderId = scriptProperties.getProperty('DEST_FOLDER_ID');
  if (!sourceFolderId || !destFolderId) {
    throw new Error(
      'SOURCE_FOLDER_ID または DEST_FOLDER_ID がスクリプトプロパティに設定されていません。'
    );
  }
  const sourceFolder = DriveApp.getFolderById(sourceFolderId);
  const destFolder = DriveApp.getFolderById(destFolderId);
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let logSheet = spreadsheet.getSheetByName('Log');
  if (!logSheet) {
    logSheet = spreadsheet.insertSheet('Log');
  }

  const files = sourceFolder.getFiles();
  while (files.hasNext()) {
    const file = files.next();
    logSheet.appendRow([file.getName(), new Date()]);
    DriveApp.getFileById(file.getId()).moveTo(destFolder);
  }
}
