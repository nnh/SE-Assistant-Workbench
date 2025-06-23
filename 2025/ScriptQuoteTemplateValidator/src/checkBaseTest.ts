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
} from './commonForTest';
import { checkTrialSheet_ } from './checkTest';
export function checkTest1_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): void {
  const testKey = testPatternKeys.get(0);
  if (!testKey) {
    throw new Error('Test pattern key not found for index 0');
  }
  console.log(`テストパターンキー：${testKey}`);
  // テストパターン１、２でTrialシートのチェックを行う
  checkTrialSheet_(spreadsheet);
}
export function checkTest2_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): void {
  const testKey = testPatternKeys.get(1);
  if (!testKey) {
    throw new Error('Test pattern key not found for index 1');
  }
  console.log(`テストパターンキー：${testKey}`);
  // テストパターン１、２でTrialシートのチェックを行う
  checkTrialSheet_(spreadsheet);
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
  const coefficients = trialSheet.getRange('B44').getValues();
  // プロトコル等作成支援は固定
}
