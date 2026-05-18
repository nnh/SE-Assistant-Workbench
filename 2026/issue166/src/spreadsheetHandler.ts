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
export class SpreadsheetHandler {
  constructor(private ss: GoogleAppsScript.Spreadsheet.Spreadsheet) {}

  /** ヘッダー行を設定 */
  public setHeader(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    headers: string[]
  ): void {
    sheet.clearContents(); // 既存の内容をクリア
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setBackground('#d9ead3')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
  }
  /** 出力用シートを取得・初期化 */
  public getOutputSheet(
    sheetName: string,
    headers: string[]
  ): GoogleAppsScript.Spreadsheet.Sheet {
    let sheet = this.ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = this.ss.insertSheet(sheetName);
    }
    this.setHeader(sheet, headers);
    return sheet;
  }

  /** データをシートに書き込む */
  public addDataToSheet(
    data: string[][],
    sheet: GoogleAppsScript.Spreadsheet.Sheet
  ): void {
    if (data.length === 0) return;
    const targetRange = sheet.getRange(
      sheet.getLastRow() + 1,
      1,
      data.length,
      data[0].length
    );
    targetRange.setNumberFormat('@');
    targetRange.setValues(data);
    sheet.autoResizeColumns(1, data[0].length);
  }
}
