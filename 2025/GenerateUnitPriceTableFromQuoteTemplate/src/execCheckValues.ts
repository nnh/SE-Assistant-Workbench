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
  removeCommasAndSpaces_,
  variableSheetNameMap,
} from './common';
import { coefficient_10_2015 } from './forTest_coefficient_10_2015';
import {
  coefficient_10_2025,
  coefficient_15_2025,
} from './forTest_coefficient_10_2025';
import {
  variable1_2015_10,
  variable1_2015_15,
  variable3_2015_10,
  variable3_2015_15,
  variable1_2025_10,
  variable1_2025_15,
  variable3_2025_10,
  variable3_2025_15,
} from './variablesConst';

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
    compareValues.set('coefficient10_1', variable1_2015_10);
    compareValues.set('coefficient15_1', variable1_2015_15);
    compareValues.set('coefficient10_3', variable3_2015_10);
    compareValues.set('coefficient15_3', variable3_2015_15);
  } else if (year === '2025') {
    compareValues.set('coefficient10', coefficient_10_2025);
    compareValues.set('coefficient15', coefficient_15_2025);
    compareValues.set('coefficient10_1', variable1_2025_10);
    compareValues.set('coefficient15_1', variable1_2025_15);
    compareValues.set('coefficient10_3', variable3_2025_10);
    compareValues.set('coefficient15_3', variable3_2025_15);
  } else {
    throw new Error(`Unsupported year: ${year}`);
  }
  coefficientSheetNameMap.forEach((sheetName_, key) => {
    const targetCompareValuesKey: string[] = [];
    compareValues.forEach((_, compareKey) => {
      if (compareKey.startsWith(key)) {
        targetCompareValuesKey.push(compareKey);
      }
    });
    targetCompareValuesKey.forEach(compareKey => {
      let sheetName: string;
      if (compareKey === key) {
        sheetName = sheetName_;
      } else if (compareKey.endsWith('_1')) {
        sheetName = `${variableSheetNameMap.get('createDatabase')!}_${sheetName_}`;
      } else if (compareKey.endsWith('_3')) {
        sheetName = `${variableSheetNameMap.get('centralMonitoring')!}_${sheetName_}`;
      } else {
        sheetName = sheetName_;
      }
      const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
        ss.getSheetByName(sheetName);
      if (!sheet) {
        throw new Error(`Sheet ${sheetName} not found in spreadsheet.`);
      }
      const inputValues: string[][] = sheet
        .getDataRange()
        .getValues() as string[][];
      const compareValue: string[][] | undefined =
        compareValues.get(compareKey);
      if (!compareValue) {
        throw new Error(`No compare values found for key: ${compareKey}`);
      }
      const result: boolean = compareValues_(inputValues, compareValue);
      if (result) {
        console.log(`Values match for ${sheetName} (${key})`);
      }
    });
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
        const rValueStr: string = removeCommasAndSpaces_(
          row[outputRowMap.get('basePrice')!]
        );
        const rValue = Number(rValueStr);
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
