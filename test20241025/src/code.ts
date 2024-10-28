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
const constNoRef: string = '参照なし';
const constRef1Header: string[][] = [['参照元シート', '参照先シート']];
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
    return [[sheet.getName(), constNoRef]];
  }
  const res: string[][] = setTest.map(x => [
    sheet.getName(),
    x.replace('!', ''),
  ]);
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
  const sheets: string[][] = getSheetList_(ss);
  // 参照の一覧を取得
  const refList: string[][] = getRefList1_(ss, sheets);
}
function getRefList2(inputData: string[][] | null = null) {
  const ref1Sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('参照情報１');
  if (ref1Sheet === null) {
    throw new Error('No sheet named 参照情報１');
  }
  const ref1Index: number = 1;
  const ref1Value: string[][] =
    inputData !== null
      ? inputData
      : ref1Sheet
          .getRange(2, 1, ref1Sheet.getLastRow(), ref1Sheet.getLastColumn())
          .getValues();
  const refToSheet: string[] = ref1Value
    .map(x => x[ref1Index])
    .flat()
    .filter(x => x !== constNoRef);
  const refToSheetUniqueSet: Set<string> = new Set(refToSheet);
  const refToSheetUnique: string[][] = Array.from(refToSheetUniqueSet).map(
    x => [x]
  );
  const outputSheetRef: GoogleAppsScript.Spreadsheet.Sheet =
    getOutputSheet_('参照情報２');
  outputSheetRef.clear();
  outputSheetRef
    .getRange(1, 1, 1, 2)
    .setValues([['参照されているシート', '参照元も参照先もないシート']]);
  outputSheetRef
    .getRange(2, 1, refToSheetUnique.length, refToSheetUnique[0].length)
    .setValues(refToSheetUnique);
  const nonRefSheets: string[][] = ref1Value
    .map(([refFromSheet, refToSheet]) => {
      if (refToSheetUniqueSet.has(refFromSheet)) {
        return null;
      }
      if (refToSheet !== constNoRef) {
        return null;
      }
      return [refFromSheet, refToSheet];
    })
    .filter(x => x !== null);

  outputSheetRef
    .getRange(2, 2, nonRefSheets.length, nonRefSheets[0].length)
    .setValues(nonRefSheets);
}
function getRefList1_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheets: string[][]
): string[][] {
  const targetSheets: string[] = sheets.map(sheet => `${sheet[0]}!`);
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
    getOutputSheet_('参照情報１');
  outputSheetRef.clear();
  outputSheetRef.getRange(1, 1, 1, 2).setValues(constRef1Header);
  outputSheetRef
    .getRange(2, 1, refList.length, refList[0].length)
    .setValues(refList);
  return refList;
}
function getSheetList_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet
): string[][] {
  const sheets: string[][] = ss.getSheets().map(sheet => [sheet.getName()]);
  const outputSheetList: GoogleAppsScript.Spreadsheet.Sheet =
    getOutputSheet_('シート名');
  outputSheetList.clear();
  outputSheetList
    .getRange(1, 1, sheets.length, sheets[0].length)
    .setValues(sheets);
  return sheets;
}
