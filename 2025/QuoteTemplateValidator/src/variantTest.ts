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
  const trialTypeAndValueMap: Map<string, number> = new Map();
  trialTypeAndValueMap.set('観察研究・レジストリ', 1);
  trialTypeAndValueMap.set('医師主導治験', 5);
  trialTypeAndValueMap.set('介入研究（特定臨床研究以外）', 2);
  trialTypeAndValueMap.set('特定臨床研究', 3);
  trialTypeAndValueMap.set('先進', 5);
  trialTypeAndValueMap.forEach((value, key) => {
    const crfList = [100, 1000, 2000, 3000];
    const caseCount = [10, 50, 100, 1000];
    const coefficient = [1, 1.5];
    crfList.forEach(crf => {
      caseCount.forEach(caseCount => {
        coefficient.forEach(coef => {
          const variant3: number = calcVariant3_(value, caseCount, crf, coef);
          trialCoefficientRange.setValue(coef);
          trialCrfRange.setValue(crf);
          trialTrialTypeKeyRange.setValue(key);
          trialCaseRange.setValue(caseCount);
          SpreadsheetApp.flush();
          const itemsVariant3Price = itemsSheet
            .getRange(itemNameAndRowMap.get(itemNames[2])!, 3, 1, 1)
            .getValue();
          if (itemsVariant3Price !== variant3) {
            throw new Error(
              `Variant 3 price for "${itemNames[2]}" is incorrect. Expected: ${variant3}, Actual: ${itemsVariant3Price}`
            );
          }
        });
      });
    });
  });
  console.log('変動3のテストが成功しました。');
  const trialTypes: string[] = Array.from(trialTypeAndValueMap.keys());
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
function calcVariant3_(
  trialTypeValue: number,
  caseCount: number,
  crf: number,
  coefficient: number
): number {
  const temp1 = Math.log(caseCount) / Math.LN2;
  const part1 = logBase_(caseCount, 10 + temp1); // LOG(B28,10) + LOG(B28,2)
  const part2 = Math.log10(crf); // LOG(B30,10)
  const intermediate = part1 * part2 * trialTypeValue * 25000;
  const roundedIntermediate = roundToThousands_(intermediate); // 内側のROUND(..., -3)
  const result = roundToThousands_(roundedIntermediate * 1.07); // 外側のROUND(..., -3)
  const coffiientResult = roundToThousands_(result * coefficient); // 最終的な係数を掛ける
  return coffiientResult;
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
function logBase_(x: number, base: number) {
  return Math.log(x) / Math.log(base);
}

function roundToThousands_(num: number): number {
  return Math.round(num / 1000) * 1000;
}
