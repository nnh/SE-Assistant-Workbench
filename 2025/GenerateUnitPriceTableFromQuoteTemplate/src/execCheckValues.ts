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
import { coefficientSheetNameMap, outputRowMap } from './common';
import { coefficient_10_2015 } from './forTest_coefficient_10_2015';
function compareValues_(
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
        const inputValue =
          typeof inputRow[j] === 'number'
            ? String(inputRow[j]).replace(/[\s,]/g, '')
            : inputRow[j].replace(/[\s,]/g, '');
        const compareValue = compareRow[j].replace(/[\s,]/g, '');
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
export function execCheckValues_(year: string): boolean {
  // シート名
  const spreadsheetId: string | null =
    PropertiesService.getScriptProperties().getProperty(
      `OUTPUT_SPREADSHEET_${year}`
    );
  if (!spreadsheetId) {
    throw new Error(
      `OUTPUT_SPREADSHEET_${year} is not set in script properties.`
    );
  }
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(spreadsheetId);
  if (!ss) {
    throw new Error(`Spreadsheet with ID ${spreadsheetId} not found.`);
  }
  const compareValues: Map<string, string[][]> = new Map();
  if (year === '2015') {
    compareValues.set('coefficient10', coefficient_10_2015);
    const coefficient_15_2015: string[][] =
      convertCoefficient10To15_(coefficient_10_2015);
    compareValues.set('coefficient15', coefficient_15_2015);
  } else if (year === '2025') {
    compareValues.set('coefficient10', coefficient_10_2015);
    compareValues.set('coefficient15', coefficient_10_2015);
  } else {
    throw new Error(`Unsupported year: ${year}`);
  }
  coefficientSheetNameMap.forEach((sheetName, key) => {
    const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
      ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet ${sheetName} not found in spreadsheet.`);
    }
    const inputValues: string[][] = sheet
      .getDataRange()
      .getValues() as string[][];
    const compareValue: string[][] | undefined = compareValues.get(key);
    if (!compareValue) {
      throw new Error(`No compare values found for key: ${key}`);
    }
    const result: boolean = compareValues_(inputValues, compareValue);
    if (result) {
      console.log(`Values match for ${sheetName} (${key})`);
    }
  });
  console.log(`All values checked for year ${year}.`);
  return true; // 全てのチェックが成功した場合はtrueを返す
}

function convertCoefficient10To15_(coefficient10: string[][]): string[][] {
  const majorItems = [
    'プロトコル等作成支援',
    '薬事戦略相談支援',
    '競争的資金獲得支援',
    'プロジェクト管理',
    '試験事務局業務',
    'モニタリング業務',
    'データベース管理',
    '準備作業',
    'EDC構築',
    '中央モニタリング',
    'データセット作成',
    '安全性管理業務',
    '統計解析業務',
    '研究結果報告書業務',
    '研究結果発表',
    'その他',
  ];
  // ヘッダー行をコピー
  const result: string[][] = [coefficient10[0]];

  for (let i = 1; i < coefficient10.length; i++) {
    const row = [...coefficient10[i]];
    const majorItem = row[outputRowMap.get('major')!];
    if (majorItems.includes(majorItem)) {
      if (
        majorItem !== '研究結果発表' ||
        (majorItem === '研究結果発表' &&
          row[outputRowMap.get('minor')!] === '論文作成')
      ) {
        const rValue = Number(
          String(row[outputRowMap.get('basePrice')!]).replace(/[\s,]/g, '')
        );
        if (!isNaN(rValue)) {
          const newValue: number = roundToNearest100_(rValue * 1.5);
          row[outputRowMap.get('price')!] = String(newValue);
        }
      }
    }
    result.push(row);
  }
  return result;
}
function roundToNearest100_(amount: number): number {
  return Math.round(amount / 1000) * 1000;
}
