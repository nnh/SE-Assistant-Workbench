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
  testPatternKeys,
  getSheetBySheetName_,
  trialSheetName,
  coefficients15,
  observationalStudy,
} from './commonForTest';
import { checkTrialSheet_ } from './checkTest';
export function checkTestMain_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  index: number
): void {
  const testKey = testPatternKeys.get(index);
  if (!testKey) {
    throw new Error(`Test pattern key not found for index ${index}`);
  }
  console.log(`テストパターンキー：${testKey}`);
  // テストパターン１、２でTrialシートのチェックを行う
  if (index === 0 || index === 1) {
    checkTrialSheet_(spreadsheet);
  }
  checkTotal1Sheet_(spreadsheet);
}

function checkTotal1Sheet_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): void {
  const totalSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    spreadsheet,
    'Total'
  );
  const trialSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    spreadsheet,
    trialSheetName
  );
  const setupMonth: number =
    trialSheet.getRange('B27').getValue() === observationalStudy ? 3 : 6;
  const closingMonth: number =
    trialSheet.getRange('B27').getValue() === observationalStudy ? 3 : 6;
  const totalMonth: number = trialSheet.getRange('F40').getValue();
  const registrationMonth: number = totalMonth - setupMonth - closingMonth;
  const quotationRequestSheet: GoogleAppsScript.Spreadsheet.Sheet =
    getSheetBySheetName_(spreadsheet, 'Quotation Request');
  const total1CheckMap = new Map<string, number>([
    ['F6', 1],
    ['F7', 4],
    ['F9', quotationRequestSheet.getRange('H2').getValue() === 'あり' ? 1 : 0],
    ['F11', quotationRequestSheet.getRange('U2').getValue() === 'あり' ? 1 : 0],
    ['F13', totalMonth],
    [
      'F16',
      quotationRequestSheet.getRange('AB2').getValue() === 'あり' ? 1 : 0,
    ],
    ['F32', 1],
    ['F33', totalMonth - setupMonth],
    ['F36', 1],
    ['F37', 0],
    ['F39', 1],
    ['F40', 1],
    ['F41', trialSheet.getRange('B29').getValue()],
    ['F42', 1],
    ['F44', registrationMonth],
    ['F47', 1],
    [
      'F50',
      quotationRequestSheet.getRange('S2').getValue() === 'あり'
        ? registrationMonth
        : 0,
    ],
    [
      'F51',
      quotationRequestSheet.getRange('T2').getValue() === 'あり'
        ? registrationMonth
        : 0,
    ],
    ['F61', 0],
    ['F62', 0],
    ['F63', 0],
    ['F69', 0],
    ['F70', 0],
    ['F71', 0],
    ['F79', quotationRequestSheet.getRange('R2').getValue() !== '' ? 1 : 0],
    ['F81', 0],
    ['F82', 0],
    ['F83', 0],
    ['F84', 0],
    ['F85', 0],
    ['F86', 0],
    ['F87', 0],
    ['F88', 0],
    ['F89', 0],
    ['F90', 0],
    ['F91', 0],
    ['F92', 0],
    ['F93', 0],
    ['F94', 0],
  ]);
  const officeSupport: boolean =
    quotationRequestSheet.getRange('AQ2').getValue() === 'あり' ||
    quotationRequestSheet.getRange('AN2').getValue() === coefficients15;
  total1CheckMap.set('F15', officeSupport ? setupMonth : 0);
  total1CheckMap.set('F17', 0);
  total1CheckMap.set('F18', 0);
  total1CheckMap.set('F19', 0);
  total1CheckMap.set('F20', 0);
  total1CheckMap.set('F21', 0);
  total1CheckMap.set('F22', 0);
  total1CheckMap.set('F23', officeSupport ? registrationMonth : 0);
  total1CheckMap.set('F24', officeSupport ? 1 : 0);
  total1CheckMap.set('F25', 0);
  total1CheckMap.set('F26', 0);
  total1CheckMap.set('F28', 0);
  total1CheckMap.set('F29', 0);
  total1CheckMap.set('F31', 0);
  total1CheckMap.set('F45', 1);
  total1CheckMap.set('F48', 0);
  total1CheckMap.set('F53', 0);
  total1CheckMap.set('F54', 0);
  total1CheckMap.set('F55', 0);
  total1CheckMap.set('F56', 0);
  total1CheckMap.set('F57', 0);
  total1CheckMap.set('F59', 0);
  total1CheckMap.set('F65', 0);
  total1CheckMap.set('F66', 0);
  total1CheckMap.set('F67', 0);
  total1CheckMap.set('F73', 0);
  total1CheckMap.set('F74', 0);
  total1CheckMap.set('F76', 0);
  total1CheckMap.set('F77', 0);
  total1CheckMap.forEach((expectedValue, cell) => {
    const actualValue = totalSheet.getRange(cell).getValue();
    if (actualValue !== expectedValue) {
      throw new Error(
        `Total1シート!${cell}の値が不正です。期待値: ${expectedValue}, 実際の値: ${actualValue}`
      );
    }
  });
  console.log('Total1シートのチェックが完了しました。');
}
