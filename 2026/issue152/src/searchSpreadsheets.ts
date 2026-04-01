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
import { SHEET_NAME_TARGET_LIST } from './const';
/**
 * スクリプトプロパティからフォルダIDを取得し、
 * 条件に合致するスプレッドシートを再帰的にリストアップします。
 */
export function listSpecificSheets_() {
  // 1. スクリプトプロパティからフォルダIDを取得
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('TARGET_FOLDER_ID');

  if (!folderId) {
    throw new Error(
      'スクリプトプロパティ "TARGET_FOLDER_ID" が設定されていません。'
    );
  }

  const rootFolder: GoogleAppsScript.Drive.Folder =
    DriveApp.getFolderById(folderId);
  const results = [['ファイル名', 'URL']]; // 見出しを初期設定
  const searchWord = '移動後';

  // 2. 再帰的検索の実行
  searchFilesRecursive_(rootFolder, searchWord, results);

  // 3. スプレッドシートへの出力
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_TARGET_LIST);
  if (!sheet) {
    throw new Error(`シート "${SHEET_NAME_TARGET_LIST}" が見つかりません。`);
  }
  sheet.clear(); // 既存の内容をクリア

  if (results.length > 1) {
    sheet.getRange(1, 1, results.length, results[0].length).setValues(results);
    // 見出しを太字にして固定
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    sheet.getRange(1, 1).setValue('該当するファイルが見つかりませんでした。');
  }
}

/**
 * フォルダ内を再帰的に検索するヘルパー関数
 */
function searchFilesRecursive_(
  folder: GoogleAppsScript.Drive.Folder,
  searchWord: string,
  results: string[][]
) {
  // フォルダ内のファイルを検索（スプレッドシートのみ）
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().includes(searchWord)) {
      results.push([file.getName(), file.getUrl()]);
    }
  }

  // サブフォルダを再帰的に処理
  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    searchFilesRecursive_(subFolders.next(), searchWord, results);
  }
}
