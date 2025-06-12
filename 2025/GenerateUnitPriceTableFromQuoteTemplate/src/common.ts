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
export const variableSheetNameMap: Map<string, string> = new Map([
  ['createDatabase', '変動*1,2'],
  ['centralMonitoring', '変動*3,4'],
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
export function roundToNearest100_(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}
export function compareValues_(
  inputValues: string[][],
  compareValues: string[][]
): boolean {
  // 入力値と比較値の行数が異なる場合はエラー
  if (inputValues.length !== compareValues.length) {
    throw new Error(
      'Input values and compare values must have the same number of rows.'
    );
  }

  // 各行を比較
  for (let i = 0; i < inputValues.length; i++) {
    const inputRow = inputValues[i];
    const compareRow = compareValues[i];

    // 各列を比較
    for (let j = 0; j < inputRow.length; j++) {
      if (inputRow[j] !== compareRow[j]) {
        const inputValue: string = removeCommasAndSpaces_(inputRow[j]);
        const compareValue: string = removeCommasAndSpaces_(compareRow[j]);
        if (inputValue !== compareValue) {
          throw new Error(
            `Mismatch at row ${i + 1}, column ${j + 1}: "${inputRow[j]}" vs "${compareRow[j]}"`
          );
        }
      }
    }
  }
  return true; // 全ての値が一致した場合はtrueを返す
}
export function removeCommasAndSpaces_(value: string | number): string {
  if (typeof value === 'string') {
    return value.replace(/[\s,]/g, '');
  } else if (typeof value === 'number') {
    return String(value).replace(/[\s,]/g, '');
  }
  return value; // その他の型はそのまま返す
}
export function writeOutputSheet_(
  spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  outputSheetName: string,
  values: string[][]
) {
  const sheet = getAndClearOutputSheet_(spreadSheet, outputSheetName);
  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  sheet.hideColumns(5, 13);
  ['price', 'basePrice', 'unitPrice'].forEach(key => {
    if (outputRowMap.has(key)) {
      const col = outputRowMap.get(key)! + 1;
      setNumberFormatForColumn_(sheet, col, values.length);
    }
  });
  sheet.setColumnWidth(1, 140);
  sheet.setColumnWidth(2, 500);
  for (let col = 3; col <= values[0].length; col++) {
    if (col !== 3 && col !== 4) {
      sheet.setColumnWidth(col, 100);
    }
  }
}
export function filterOutputRow_(outputRows: string[][]): string[][] {
  const outputRowsFiltered = outputRows
    .filter(row => row[outputRowMap.get('major')!] !== '合計')
    .map(row => {
      if (
        row[outputRowMap.get('minor')!] === 'DB作成・eCRF作成・バリデーション'
      ) {
        row[outputRowMap.get('basePrice')!] = '(変動 ※1)';
        row[outputRowMap.get('price')!] = '';
      }
      if (row[outputRowMap.get('minor')!] === 'バリデーション報告書') {
        row[outputRowMap.get('basePrice')!] = '(変動 ※2)';
        row[outputRowMap.get('price')!] = '';
      }
      if (
        row[outputRowMap.get('minor')!] ===
        'ロジカルチェック、マニュアルチェック、クエリ対応'
      ) {
        row[outputRowMap.get('basePrice')!] = '(変動 ※3)';
        row[outputRowMap.get('price')!] = '';
      }
      if (row[outputRowMap.get('minor')!] === 'データクリーニング') {
        row[outputRowMap.get('basePrice')!] = '(変動 ※4)';
        row[outputRowMap.get('price')!] = '';
      }
      if (row[outputRowMap.get('minor')!] === 'プロジェクト管理') {
        row[outputRowMap.get('basePrice')!] = '(変動 ※5)';
        row[outputRowMap.get('price')!] = '';
      }
      return row;
    });
  return outputRowsFiltered;
}
