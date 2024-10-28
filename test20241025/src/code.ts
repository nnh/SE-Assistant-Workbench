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
const constSheetListSheetName: string = 'シート名';
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
    x.replace("'!", '').replace('!', ''),
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
  getRefList2(refList);
}
function getRefList2(inputData: string[][] | null = null): void {
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
  const outputSheetRef2: GoogleAppsScript.Spreadsheet.Sheet =
    getOutputSheet_('参照情報２');
  outputSheetRef2.clear();
  outputSheetRef2.getRange(1, 1, 1, 1).setValues([['参照されているシート']]);
  outputSheetRef2
    .getRange(2, 1, refToSheetUnique.length, refToSheetUnique[0].length)
    .setValues(refToSheetUnique);
  const outputSheetRef3: GoogleAppsScript.Spreadsheet.Sheet =
    getOutputSheet_('参照情報３');
  outputSheetRef3.clear();
  outputSheetRef3
    .getRange(1, 1, 1, 2)
    .setValues([['参照元も参照先もないシート', 'カテゴリ']]);
  const nonRefSheets: string[][] = ref1Value
    .map(([refFromSheet, refToSheet]) => {
      if (refToSheetUniqueSet.has(refFromSheet)) {
        return null;
      }
      if (refToSheet !== constNoRef) {
        return null;
      }
      const category = setCategory_(refFromSheet);
      return [refFromSheet, category];
    })
    .filter(x => x !== null);

  outputSheetRef3
    .getRange(2, 1, nonRefSheets.length, nonRefSheets[0].length)
    .setValues(nonRefSheets);
}
function setCategory_(sheetname: string): string {
  if (
    sheetname === 'Base' ||
    sheetname === 'Datacenter' ||
    sheetname === 'Stat'
  ) {
    return 'マスタ';
  }
  if (
    sheetname === 'Usage' ||
    sheetname === '委託予定' ||
    sheetname === 'Application'
  ) {
    return sheetname;
  }
  if (new RegExp('^DCtrialslist').test(sheetname) || sheetname === 'Members') {
    return 'DCtrialslist';
  }
  if (sheetname === 'ARO支援一覧test') {
    return 'ARO支援一覧test';
  }
  if (
    sheetname === 'Journal Information' ||
    sheetname === 'fromHtml' ||
    /^Form[2-4]印刷$/.test(sheetname) ||
    sheetname === 'pubmedData' ||
    sheetname === 'explanation'
  ) {
    return 'Publication';
  }
  return 'Others';
}
function getRefList1_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheets: string[][]
): string[][] {
  const targetSheets1: string[] = sheets.map(sheet => `${sheet[0]}!`);
  const targetSheets2: string[] = sheets.map(sheet => `'${sheet[0]}'!`);
  const targetSheets: string[] = [...targetSheets1, ...targetSheets2];
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
  const outputSheetList: GoogleAppsScript.Spreadsheet.Sheet = getOutputSheet_(
    constSheetListSheetName
  );
  outputSheetList.clear();
  outputSheetList
    .getRange(1, 1, sheets.length, sheets[0].length)
    .setValues(sheets);
  return sheets;
}
function getMoveSheetList(sheetList = null) {
  let inputSheetList: string[][];
  if (sheetList === null) {
    const sheetListSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
        constSheetListSheetName
      );
    if (sheetListSheet === null) {
      throw new Error(`No sheet named ${constSheetListSheetName}`);
    }
    inputSheetList = sheetListSheet
      .getRange(1, 1, sheetListSheet.getLastRow(), 1)
      .getValues();
  } else {
    inputSheetList = sheetList;
  }
  const outputValues: string[][] = inputSheetList.map(sheetname => [
    sheetname[0],
    setCategory_(sheetname[0]),
  ]);

  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      '移動可能シート洗い出し'
    );
  if (outputSheet === null) {
    throw new Error('No sheet named 移動可能シート洗い出し');
  }
  outputSheet.clear();
  outputSheet.getRange(1, 1, 1, 2).setValues([['シート名', 'カテゴリ']]);
  outputSheet
    .getRange(2, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}
