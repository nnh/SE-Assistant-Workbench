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
import { getSpreadsheetByProperty_ } from './common';

function checkSheetsExist_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetNames: string[]
): boolean {
  return sheetNames.every(name => spreadsheet.getSheetByName(name) !== null);
}
export function compareBeforeAfter_(
  beforeSpreadSheetPropertyKey: string,
  afterSpreadSheetPropertyKey: string
): void {
  // スクリプトプロパティからスプレッドシートを取得
  const beforeSpreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    getSpreadsheetByProperty_(beforeSpreadSheetPropertyKey);
  const afterSpreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    getSpreadsheetByProperty_(afterSpreadSheetPropertyKey);
  const targetVariablesSheetNames = [
    '変動*1,2_係数1',
    '変動*1,2_係数1.5',
    '変動*3,4_係数1',
    '変動*3,4_係数1.5',
  ];
  const targetCoefficientSheetNames = ['係数1', '係数1.5'];
  const targetSheetNames = [
    ...targetVariablesSheetNames,
    ...targetCoefficientSheetNames,
  ];
  if (
    !checkSheetsExist_(beforeSpreadSheet, targetSheetNames) ||
    !checkSheetsExist_(afterSpreadSheet, targetSheetNames)
  ) {
    throw new Error(
      '必要なシートが存在しません。スプレッドシートを確認してください。'
    );
  }
  targetSheetNames.forEach(sheetName => {
    const beforeSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
      beforeSpreadSheet.getSheetByName(sheetName);
    const afterSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
      afterSpreadSheet.getSheetByName(sheetName);
    if (!beforeSheet || !afterSheet) {
      throw new Error(`シート「${sheetName}」が見つかりません。`);
    }
    const beforeValues: string[][] = beforeSheet.getDataRange().getValues();
    const afterValues: string[][] = afterSheet.getDataRange().getValues();
    const [compareBeforeValues, compareAfterValues] = deleteColumnsForCompare_(
      beforeValues,
      afterValues,
      sheetName
    );
    //
    let targetKeys: string[] = [];
    if (sheetName.startsWith('変動*1,2_')) {
      targetKeys = ['CRF項目数'];
    } else if (sheetName.startsWith('変動*3,4_')) {
      targetKeys = ['症例数', 'CRF項目数', '試験種別名'];
    } else if (sheetName.startsWith('係数')) {
      targetKeys = ['大項目', '小項目'];
    }
    compareSheetValues_(
      compareBeforeValues,
      compareAfterValues,
      sheetName,
      targetKeys
    );
  });
}
function compareSheetValues_(
  compareBeforeValues: string[][],
  compareAfterValues: string[][],
  sheetName: string,
  targetKeys: string[]
) {
  const header = compareBeforeValues[0];
  const keyIndexes = targetKeys.map(key => header.indexOf(key));
  if (keyIndexes.some(idx => idx === -1)) {
    throw new Error(`指定されたキーがヘッダーに存在しません: ${targetKeys}`);
  }
  const makeKey = (row: string[]) => keyIndexes.map(idx => row[idx]).join('|');
  const beforeMap = new Map<string, string[]>();
  for (let i = 1; i < compareBeforeValues.length; i++) {
    const row = compareBeforeValues[i];
    beforeMap.set(makeKey(row), row);
  }
  for (let i = 1; i < compareAfterValues.length; i++) {
    const row = compareAfterValues[i];
    const key = makeKey(row);
    const beforeRow = beforeMap.get(key);
    if (!beforeRow) {
      console.warn(
        `シート「${sheetName}」: キー「${key}」がbeforeに存在しません`
      );
      continue;
    }
    for (let col = 0; col < header.length; col++) {
      if (beforeRow[col] !== row[col]) {
        // 列名が「行数」の場合は無視
        if (header[col] !== '行数') {
          console.warn(
            `シート「${sheetName}」: キー「${key}」, 列「${header[col]}」が一致しません: before="${beforeRow[col]}", after="${row[col]}"`
          );
        }
      }
    }
  }
}
function getTargetHeaders_(
  beforeHeader: string[],
  afterHeader: string[]
): Set<string> {
  const targetHeaders1 = beforeHeader.filter(header =>
    afterHeader.includes(header)
  );
  const targetHeaders2 = afterHeader.filter(header =>
    beforeHeader.includes(header)
  );
  console.log(
    'beforeHeaderにのみ存在するヘッダー:',
    beforeHeader.filter(header => !afterHeader.includes(header))
  );
  console.log(
    'afterHeaderにのみ存在するヘッダー:',
    afterHeader.filter(header => !beforeHeader.includes(header))
  );
  const targetHeader = new Set([...targetHeaders1, ...targetHeaders2]);
  return targetHeader;
}
function deleteColumnsForCompare_(
  beforeValues: string[][],
  afterValues: string[][],
  sheetName: string
): string[][][] {
  const beforeHeader = beforeValues[0];
  const afterHeader = afterValues[0];
  let compareBeforeValues: string[][] = [...beforeValues];
  let compareAfterValues: string[][] = [...afterValues];
  if (beforeHeader.length !== afterHeader.length) {
    console.warn(
      `シート「${sheetName}」のヘッダーの列数が一致しません。` +
        `before: ${beforeHeader.length}, after: ${afterHeader.length}`
    );
    const targetHeaders: Set<string> = getTargetHeaders_(
      beforeHeader,
      afterHeader
    );
    targetHeaders.forEach(header => {
      const beforeIndex = beforeHeader.indexOf(header);
      const afterIndex = afterHeader.indexOf(header);
      if (beforeIndex === -1 && afterIndex > -1) {
        // afterHeaderにのみ存在する列をcompareAfterValuesから削除
        compareAfterValues = compareAfterValues.map(row => {
          const newRow = [...row];
          newRow.splice(afterIndex, 1);
          return newRow;
        });
      }
      if (afterIndex === -1 && beforeIndex > -1) {
        // beforeHeaderにのみ存在する列をcompareBeforeValuesから削除
        compareBeforeValues = compareBeforeValues.map(row => {
          const newRow = [...row];
          newRow.splice(beforeIndex, 1);
          return newRow;
        });
      }
    });
  }
  return [compareBeforeValues, compareAfterValues];
}
