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
import {
  coefficientSheetNameMap,
  outputRowMap,
  roundToNearest100_,
  compareValues_,
  getSpreadsheetByProperty_,
} from './common';
import { coefficient_10_2015 } from './forTest_coefficient_10_2015';

export function execCheckValues_(year: string): boolean {
  const targetProperty = `OUTPUT_SPREADSHEET_${year}`;
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet =
    getSpreadsheetByProperty_(targetProperty);

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
