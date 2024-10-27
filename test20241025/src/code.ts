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
function getOutputSheet_(
  sheetName: string
): GoogleAppsScript.Spreadsheet.Sheet {
  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (outputSheet === null) {
    throw new Error(`No sheet named ${sheetName}`);
  }
  return outputSheet;
}
function getRefSheetList_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  targetSheets: string[]
): string[][] {
  const formulas: string[] | undefined = sheet
    .getDataRange()
    .getFormulas()
    .map(row => row.filter(cell => cell !== ''))
    .flat();
  const test: string[] = formulas
    .map(formula => targetSheets.filter(x => new RegExp(x).test(formula)))
    .flat();
  const setTest: string[] = Array.from(new Set(test));
  if (setTest.length === 0) {
    return [[sheet.getName(), '参照なし']];
  }
  const res: string[][] = setTest.map(x => [sheet.getName(), x]);
  return res;
}
function test20241025() {
  const ssId: string | null =
    PropertiesService.getScriptProperties().getProperty('targetSsId');
  if (ssId === null) {
    throw new Error('No targetSsId');
  }
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(ssId);
  console.log(ss.getName());
  // シート一覧を取得
  const sheets: string[][] = ss.getSheets().map(sheet => [sheet.getName()]);
  const outputSheetList: GoogleAppsScript.Spreadsheet.Sheet =
    getOutputSheet_('シート名');
  outputSheetList.clear();
  outputSheetList
    .getRange(1, 1, sheets.length, sheets[0].length)
    .setValues(sheets);
  const targetSheets: string[] = sheets.map(sheet => `${sheet[0]}!`);
  // 参照の一覧を取得
  const refList: string[][] = sheets
    .map(sheet => {
      const refSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
        ss.getSheetByName(sheet[0]);
      if (refSheet === null) {
        throw new Error(`No ${sheet[0]} sheet`);
      }
      return getRefSheetList_(refSheet, targetSheets);
    })
    .flat();
  const outputSheetRef: GoogleAppsScript.Spreadsheet.Sheet =
    getOutputSheet_('参照情報');
  outputSheetRef.clear();
  outputSheetRef
    .getRange(1, 1, 1, 2)
    .setValues([['参照元シート', '参照先シート']]);
  outputSheetRef
    .getRange(2, 1, refList.length, refList[0].length)
    .setValues(refList);
}
