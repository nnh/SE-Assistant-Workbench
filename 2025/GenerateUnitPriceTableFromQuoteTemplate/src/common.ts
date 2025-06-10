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
export const outputRowMap: Map<string, number> = new Map([
  ['major', 0],
  ['minor', 1],
  ['price', 2],
  ['basePrice', 17],
  ['unitPrice', 18],
]);

export const coefficientSheetNameMap: Map<string, string> = new Map([
  ['coefficient10', '係数1'],
  ['coefficient15', '係数1.5'],
]);

export function getSpreadsheetByProperty_(
  propertyName: string
): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const spreadsheetId: string | null =
    PropertiesService.getScriptProperties().getProperty(propertyName);
  if (!spreadsheetId) {
    throw new Error(`${propertyName} is not set in script properties.`);
  }
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(spreadsheetId);
  if (!spreadsheet) {
    throw new Error(`Spreadsheet with ID ${spreadsheetId} not found.`);
  }
  return spreadsheet;
}
export function getAndClearOutputSheet_(
  spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  outputSheetName: string
): GoogleAppsScript.Spreadsheet.Sheet {
  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    spreadSheet.getSheetByName(outputSheetName);
  const sheet: GoogleAppsScript.Spreadsheet.Sheet = !outputSheet
    ? spreadSheet.insertSheet()
    : outputSheet;
  sheet.setName(outputSheetName);
  sheet.clear();
  return sheet;
}
/**
 * 指定したシートの列に対して、2行目から最終行まで数値フォーマットを設定する
 * @param sheet 対象のシート
 * @param col 列番号（1始まり）
 * @param lastRow 最終行番号
 */
export function setNumberFormatForColumn_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  col: number,
  lastRow: number
) {
  if (lastRow <= 1) return; // データ行がなければ何もしない
  sheet.getRange(2, col, lastRow - 1, 1).setNumberFormat('#,##0_);(#,##0)');
}
