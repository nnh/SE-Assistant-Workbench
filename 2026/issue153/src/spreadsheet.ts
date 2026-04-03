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
/**
 * スプレッドシートの指定したシートから全てのデータを取得します。
 * * @param sheetName - 取得対象のシート名
 * @returns シート内の全データ（2次元配列）
 */
export const getAllDataFromSheet_ = (sheetName: string): string[][] => {
  // スクリプトプロパティからスプレッドシートIDを取得
  const props = PropertiesService.getScriptProperties();
  const spreadsheetId = props.getProperty('SPREADSHEET_ID');

  if (!spreadsheetId) {
    throw new Error(
      'スクリプトプロパティ "SPREADSHEET_ID" が設定されていません。'
    );
  }

  // スプレッドシートとシートの取得
  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    throw new Error(`シート名 "${sheetName}" が見つかりませんでした。`);
  }

  // データが存在しない場合は空配列を返す
  const lastRow = sheet.getLastRow();
  const lastColumn = sheet.getLastColumn();

  if (lastRow === 0 || lastColumn === 0) {
    return [];
  }

  // 全てのデータを取得して返す
  return sheet.getRange(1, 1, lastRow, lastColumn).getValues() as string[][];
};
