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
  trialTypeAndValueMap,
  getItemsSheetItems_,
  getRowsUntilTotal_,
  roundToThousands_,
} from './commonForTest';
/**
 * Checks if the "項目" and "摘要" columns in the Items sheet match those in the Setup and Closing sheets.
 * @param spreadsheetId The ID of the spreadsheet to check.
 * @returns An array of mismatch messages, or an empty array if all match.
 */
export function validateItemsAndSummaryMatch_(): void {
  const spreadsheetId: string = copyTemplateSpreadsheetAndSaveId_();
  console.log('Setup～Closingシートのチェックを開始します。');
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet | null =
    getSpreadsheetById_(spreadsheetId);
  if (!ss) {
    throw new Error('Spreadsheet not found after copying.');
  }
  const [trialSheet, itemsSheet] = getTrialsAndItemsSheets_(ss);
  trialSheet.getRange('D32:E40').setValues([
    ['2020/4/1', '2021/3/31'],
    ['2021/4/1', '2022/3/31'],
    ['2022/4/1', '2023/3/31'],
    ['2023/4/1', '2024/3/31'],
    ['2024/4/1', '2025/3/31'],
    ['2025/4/1', '2026/3/31'],
    ['2026/4/1', '2027/3/31'],
    ['2027/4/1', '2028/3/31'],
    ['2020/4/1', '2028/3/31'],
  ]);
  const itemsSheetItems: string[][] = getItemsSheetItems_(itemsSheet);
  const setupToClosingSheetNames = [
    'Setup',
    'Registration_1',
    'Registration_2',
    'Interim_1',
    'Observation_1',
    'Interim_2',
    'Observation_2',
    'Closing',
  ];
  setupToClosingSheetNames.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" does not exist.`);
    }
    const sheetValues: string[][] = sheet
      .getRange(`B5:G${sheet.getLastRow()}`)
      .getValues() as string[][];
    const sheetItems: string[][] = getRowsUntilTotal_(sheetValues);
    itemsSheetItems.forEach((item, idx) => {
      const itemNameMajor: string = item[0];
      const itemNameMinor: string = item[1];
      const itemPrice: string = item[2];
      const itemUnit: string = item[3];
      if (itemNameMajor !== sheetItems[idx][0]) {
        throw Error(
          `Mismatch in ${sheetName} sheet: Item major "${itemNameMajor}" does not match "${sheetItems[idx][0]}".`
        );
      }
      if (itemNameMinor !== sheetItems[idx][1]) {
        throw Error(
          `Mismatch in ${sheetName} sheet: Item minor "${itemNameMinor}" does not match "${sheetItems[idx][1]}".`
        );
      }
      if (itemPrice !== sheetItems[idx][2]) {
        if (itemNameMinor !== 'プロジェクト管理') {
          throw Error(
            `Mismatch in ${sheetName} sheet: Item price "${itemPrice}" does not match "${sheetItems[idx][2]}".`
          );
        }
      }
      if (itemUnit !== sheetItems[idx][5]) {
        throw Error(
          `Mismatch in ${sheetName} sheet: Item unit "${itemUnit}" does not match "${sheetItems[idx][5]}".`
        );
      }
    });
    console.log(`All items in ${sheetName} sheet match with Items sheet.`);
    let totalPrice = 0;
    let projectManagementRow = -1;
    sheet.getRange('F:F').clearContent(); // Clear the F column before setting values
    for (let i = 0; i < sheetItems.length; i++) {
      if (sheet.getRange(5 + i, 7).getValue() !== '') {
        sheet.getRange(5 + i, 6).setValue(3);
        if (sheet.getRange(5 + i, 3).getValue() !== 'プロジェクト管理') {
          totalPrice += parseFloat(sheetItems[i][2]) * 3;
        } else {
          projectManagementRow = i + 5; // Store the row index for "プロジェクト管理"
          sheet.getRange(5 + i, 6).setValue(1);
        }
      }
    }
    if (projectManagementRow === -1) {
      throw new Error(
        'プロジェクト管理の行が見つかりません。Itemsシートを確認してください。'
      );
    }
    totalPrice += sheet.getRange(projectManagementRow, 4).getValue();
    if (totalPrice !== sheet.getRange('H96').getValue()) {
      throw new Error(
        `Total price mismatch in ${sheetName} sheet: Expected ${totalPrice}, but found ${sheet.getRange('H96').getValue()}.`
      );
    }
    console.log(
      `Total price in ${sheetName} sheet matches with Items sheet: ${totalPrice}.`
    );
  });
}
