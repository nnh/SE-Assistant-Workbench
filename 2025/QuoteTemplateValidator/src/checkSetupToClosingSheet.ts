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
  getItemsSheetItems_,
  getRowsUntilTotal_,
  getSheetBySheetName_,
} from './commonForTest';
/**
 * Checks if the "項目" and "摘要" columns in the Items sheet match those in the Setup and Closing sheets.
 * @param spreadsheetId The ID of the spreadsheet to check.
 * @returns An array of mismatch messages, or an empty array if all match.
 */
export function validateItemsAndSummaryMatch_(): void {
  const tax = 1.1;
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
  setupToClosingSheetNames.forEach((sheetName, index) => {
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
        sheet.getRange(5 + i, 6).setValue(index + 2);
        if (sheet.getRange(5 + i, 3).getValue() !== 'プロジェクト管理') {
          totalPrice += sheet.getRange(5 + i, 4).getValue() * (index + 2);
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
    // 消費税の確認
    if (
      Math.floor(sheet.getRange('H96').getValue() * tax) !==
      Math.floor(sheet.getRange('H98').getValue())
    ) {
      throw new Error(
        `消費税の計算が正しくありません。${sheetName}シートの合計価格は ${sheet.getRange('H96').getValue()} で、消費税を加えた価格は ${sheet.getRange('H98').getValue()} です。`
      );
    }
    console.log(
      `Total price in ${sheetName} sheet matches with Items sheet: ${totalPrice}.`
    );
  });
  // Totalシートの合計とTotal2シートの合計とSetup～Closingシートの合計が一致するか確認
  const total1Sheet = getSheetBySheetName_(ss, 'Total');
  const total2Sheet = getSheetBySheetName_(ss, 'Total2');
  const total1Value = total1Sheet.getRange('H96').getValue();
  const total2Value = total2Sheet.getRange('L96').getValue();
  if (total1Value !== total2Value) {
    throw new Error(
      `Total1 and Total2 sheets do not match: Total1 = ${total1Value}, Total2 = ${total2Value}.`
    );
  }
  const totalH96Sum = setupToClosingSheetNames.reduce((sum, sheetName) => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      throw new Error(`Sheet "${sheetName}" does not exist.`);
    }
    const value = sheet.getRange('H96').getValue();
    return sum + (typeof value === 'number' ? value : 0);
  }, 0);
  if (totalH96Sum !== total1Value) {
    throw new Error(
      `Total H96 sum does not match Total1 value: Total H96 sum = ${totalH96Sum}, Total1 = ${total1Value}.`
    );
  }
  const quoteSheet = getSheetBySheetName_(ss, 'Quote');
  const quoteTotalValue = quoteSheet.getRange('D30').getValue();
  if (quoteTotalValue !== total1Value) {
    throw new Error(
      `Quote sheet total does not match Total1 value: Quote total = ${quoteTotalValue}, Total1 = ${total1Value}.`
    );
  }
  // 消費税が正しくかかっているか確認
  if (
    quoteSheet.getRange('D30').getValue() * tax !==
    quoteSheet.getRange('D34').getValue()
  ) {
    throw new Error(
      `消費税の計算が正しくありません。Quoteシートの合計価格は ${quoteSheet.getRange('D30').getValue()} で、消費税を加えた価格は ${quoteSheet.getRange('D34').getValue()} です。`
    );
  }
  if (
    total1Sheet.getRange('H96').getValue() * tax !==
    total1Sheet.getRange('H98').getValue()
  ) {
    throw new Error(
      `消費税の計算が正しくありません。Total1シートの合計価格は ${total1Sheet.getRange('H96').getValue()} で、消費税を加えた価格は ${total1Sheet.getRange('H98').getValue()} です。`
    );
  }
  if (
    total2Sheet.getRange('L96').getValue() * tax !==
    total2Sheet.getRange('L98').getValue()
  ) {
    throw new Error(
      `消費税の計算が正しくありません。Total2シートの合計価格は ${total2Sheet.getRange('L96').getValue()} で、消費税を加えた価格は ${total2Sheet.getRange('L98').getValue()} です。`
    );
  }
}
