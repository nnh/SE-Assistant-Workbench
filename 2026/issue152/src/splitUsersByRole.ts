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
import {
  SHEET_NAME_EDITORS,
  SHEET_NAME_PERMISSIONS,
  SHEET_NAME_VIEWERS,
} from './const';
/**
 * 共有権限一覧から、編集者と閲覧者をそれぞれ1人1行に分割して別シートに出力します。
 */
export function splitUsersByRole_(): void {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(SHEET_NAME_PERMISSIONS);

    if (!sourceSheet) {
      throw new Error(
        `元データシート "${SHEET_NAME_PERMISSIONS}" が見つかりません。`
      );
    }

    const lastRow = sourceSheet.getLastRow();
    const lastCol = sourceSheet.getLastColumn();
    if (lastRow < 2) return;

    const allData = sourceSheet.getRange(1, 1, lastRow, lastCol).getValues();
    const header = allData[0];
    const rows = allData.slice(1);

    // I列(Index: 8) = 編集者, J列(Index: 9) = 閲覧者
    const editorResults: string[][] = [];
    const viewerResults: string[][] = [];

    // 元の見出しから、不要な列を除いた新しい見出しを作成
    // 編集者シート用：閲覧者(J列)を除外
    const editorHeader = header.filter((_, i) => i !== 9);
    // 閲覧者シート用：編集者(I列)を除外
    const viewerHeader = header.filter((_, i) => i !== 8);

    rows.forEach(row => {
      // --- 編集者の処理 (I列) ---
      const editors = String(row[8])
        .split('\n')
        .filter(val => val.trim() !== '');
      editors.forEach(user => {
        const newRow = [...row];
        newRow[8] = user.trim(); // I列を単一のユーザーに
        newRow.splice(9, 1); // J列(閲覧者)を削除
        editorResults.push(newRow);
      });

      // --- 閲覧者の処理 (J列) ---
      const viewers = String(row[9])
        .split('\n')
        .filter(val => val.trim() !== '');
      viewers.forEach(user => {
        const newRow = [...row];
        newRow[9] = user.trim(); // J列を単一のユーザーに
        newRow.splice(8, 1); // I列(編集者)を削除
        viewerResults.push(newRow);
      });
    });

    // 各シートへの出力
    outputToSheet_(ss, SHEET_NAME_EDITORS, editorHeader, editorResults);
    outputToSheet_(ss, SHEET_NAME_VIEWERS, viewerHeader, viewerResults);

    console.log('編集者・閲覧者の分割出力が完了しました。');
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
  }
}

/**
 * シートへの出力ヘルパー関数
 */
function outputToSheet_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string,
  header: string[],
  data: string[][]
): void {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }

  if (data.length > 0) {
    const output = [header, ...data];
    sheet.getRange(1, 1, output.length, output[0].length).setValues(output);
    sheet.getRange(1, 1, 1, output[0].length).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    sheet.getRange(1, 1).setValue('該当データなし');
  }
}
