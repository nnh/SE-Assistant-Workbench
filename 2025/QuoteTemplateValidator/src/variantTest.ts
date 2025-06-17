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
  getTrialsAndItemsSheets_,
  getSpreadsheetById_,
  copyTemplateSpreadsheetAndSaveId_,
} from './commonForTest';

export function variantTest_(): void {
  const spreadsheetId: string = copyTemplateSpreadsheetAndSaveId_();
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet | null =
    getSpreadsheetById_(spreadsheetId);
  if (!spreadsheet) {
    throw new Error('Spreadsheet not found after copying.');
  }
  const [trialSheet, itemsSheet] = getTrialsAndItemsSheets_(spreadsheet);
  const trialTrialTypeKeyRange: GoogleAppsScript.Spreadsheet.Range =
    trialSheet.getRange('B27');
  const trialTrialTypeValueRange: GoogleAppsScript.Spreadsheet.Range =
    trialSheet.getRange('C27');
  const trialCaseRange: GoogleAppsScript.Spreadsheet.Range =
    trialSheet.getRange('B28');
  const trialCrfRange: GoogleAppsScript.Spreadsheet.Range =
    trialSheet.getRange('B30');
  const trialCoefficientRange: GoogleAppsScript.Spreadsheet.Range =
    trialSheet.getRange('B44');
  const itemNames: string[] = [
    'DB作成・eCRF作成・バリデーション',
    'バリデーション報告書',
    'ロジカルチェック、マニュアルチェック、クエリ対応',
    'データクリーニング',
  ];
  const itemNameAndRowMap: Map<string, number> = new Map();
  itemNames.forEach(itemName => {
    const row: number = getTargetItemRow_(itemsSheet, itemName);
    itemNameAndRowMap.set(itemName, row);
  });
  const trialTypes = [
    '観察研究・レジストリ',
    '医師主導治験',
    '介入研究（特定臨床研究以外）',
    '特定臨床研究',
    '先進',
  ];
  const variant1_1 = [
    [1.5, 0, 161000, 0],
    [1.5, 100, 884000, 41000],
    [1.5, 1000, 4133000, 402000],
    [1.5, 2000, 5898000, 803000],
    [1.5, 3000, 7664000, 1205000],
  ];
  const variant1_2 = [
    [1, 0, 107000, 0],
    [1, 100, 589000, 27000],
    [1, 1000, 2755000, 268000],
    [1, 2000, 3932000, 535000],
    [1, 3000, 5109000, 803000],
  ];
  const variant1 = [...variant1_1, ...variant1_2]
    .map(variants => trialTypes.map(trialType => [trialType, ...variants]))
    .flat();
  variant1.forEach(([trialType, coefficient, crf, variant1, variant2]) => {
    trialCoefficientRange.setValue(coefficient);
    trialCrfRange.setValue(crf);
    trialTrialTypeValueRange.setValue(trialType);
    SpreadsheetApp.flush();
    const itemsVariant1Price = itemsSheet
      .getRange(itemNameAndRowMap.get(itemNames[0])!, 3, 1, 1)
      .getValue();
    if (itemsVariant1Price !== variant1) {
      throw new Error(
        `Variant 1 price for "${itemNames[0]}" is incorrect. Expected: ${variant1}, Actual: ${itemsVariant1Price}`
      );
    }
    const itemsVariant2Price = itemsSheet
      .getRange(itemNameAndRowMap.get(itemNames[1])!, 3, 1, 1)
      .getValue();
    if (itemsVariant2Price !== variant2) {
      throw new Error(
        `Variant 2 price for "${itemNames[1]}" is incorrect. Expected: ${variant2}, Actual: ${itemsVariant2Price}`
      );
    }
  });
  console.log('変動1、2のテストが成功しました。');
}
function getTargetItemRow_(
  itemsSheet: GoogleAppsScript.Spreadsheet.Sheet,
  itemName: string
): number {
  const dataRange = itemsSheet.getDataRange();
  const values = dataRange.getValues();
  for (let i = 0; i < values.length; i++) {
    if (values[i][1] === itemName) {
      return i + 1; // Return the row number (1-based index)
    }
  }
  throw new Error(`Item "${itemName}" not found in the sheet.`);
}
