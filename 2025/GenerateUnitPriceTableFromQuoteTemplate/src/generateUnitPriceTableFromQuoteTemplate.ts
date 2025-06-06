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
const dailyUnitPriceFormulaRow = 16;
const numberOfPeopleFormulaRows = [14, 15];
const numberOfDaysFormulaRows = [14, 15, 16];
const dailyUnitPriceArray: number[] = [];
const numberOfPeopleArray: [row: number, value: number[]][] = [];
const numberOfDaysArray: number[] = [];
export function generateUnitPriceTableFromQuoteTemplate_() {
  const inputSpreadSheetId: string | null =
    PropertiesService.getScriptProperties().getProperty('INPUT_SPREADSHEET_ID');
  if (!inputSpreadSheetId) {
    throw new Error('INPUT_SPREADSHEET_ID is not set in script properties.');
  }
  const inputSpreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(inputSpreadSheetId);
  if (!inputSpreadSheet) {
    throw new Error(`Spreadsheet with ID ${inputSpreadSheetId} not found.`);
  }
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    inputSpreadSheet.getSheetByName('Items');
  if (!inputSheet) {
    throw new Error('Sheet "Items" not found in the spreadsheet.');
  }
  const inputData: GoogleAppsScript.Spreadsheet.Range =
    inputSheet.getDataRange();
  const numberOfDays: [row: number, value: string][] =
    getNumberOfDaysAndRow_(inputSheet);
  const numberOfPeople: [row: number, value: string][] =
    getNumberOfPeopleAndRow_(inputSheet);
  const dailyUnitPrices: [row: number, value: number][] =
    getDailyUnitPriceAndRow_(inputSheet);
  const values: string[][] = inputData.getValues();
  const itemNames: Array<[row: number, major: string, minor: string]> =
    getItemNameAndRow_(values, inputSheet);
  // itemNamesとdailyUnitPricesをrowをキーにして多対多の結合
  const rowAndItemNameAndDailyPrices: Array<
    [row: number, major: string, minor: string, unitPrice: number]
  > = [];

  for (const [row, major, minor] of itemNames) {
    if (row === dailyUnitPriceFormulaRow) {
      const row16UnitPrice =
        minor === 'CTR登録案' ? dailyUnitPriceArray[0] : dailyUnitPriceArray[1];
      rowAndItemNameAndDailyPrices.push([row, major, minor, row16UnitPrice]);
    } else {
      for (const [priceRow, unitPrice] of dailyUnitPrices) {
        if (row === priceRow) {
          rowAndItemNameAndDailyPrices.push([row, major, minor, unitPrice]);
        }
      }
    }
  }
  // rowAndItemNameAndDailyPricesとnumberOfPeopleをrowをキーにして多対多の結合
  const rowAndItemNameAndDailyPricesAndNumberOfPeople: Array<
    [
      row: number,
      major: string,
      minor: string,
      unitPrice: number,
      numberOfPeople: number,
    ]
  > = [];
  for (const [row, major, minor, unitPrice] of rowAndItemNameAndDailyPrices) {
    if (numberOfPeopleFormulaRows.includes(row)) {
      const targetIndex: number = numberOfPeopleFormulaRows.indexOf(row);
      const targetValueArray: number[] = numberOfPeopleArray[targetIndex][1];
      if (row === numberOfPeopleFormulaRows[0]) {
        const numberOfPeople: number =
          minor === 'ミーティング準備・実行' ||
          minor === 'キックオフミーティング準備・実行'
            ? targetValueArray[0]
            : targetValueArray[1];
        rowAndItemNameAndDailyPricesAndNumberOfPeople.push([
          row,
          major,
          minor,
          unitPrice,
          numberOfPeople,
        ]);
      } else if (row === numberOfPeopleFormulaRows[1]) {
        const numberOfPeople: number =
          minor === '症例検討会準備・実行'
            ? targetValueArray[0]
            : targetValueArray[1];
        rowAndItemNameAndDailyPricesAndNumberOfPeople.push([
          row,
          major,
          minor,
          unitPrice,
          numberOfPeople,
        ]);
      } else {
        console.warn(`Row ${row} is not in numberOfPeopleFormulaRows.`);
      }
    } else {
      for (const [peopleRow, numberOfPeopleValue] of numberOfPeople) {
        if (row === peopleRow) {
          rowAndItemNameAndDailyPricesAndNumberOfPeople.push([
            row,
            major,
            minor,
            unitPrice,
            Number(numberOfPeopleValue),
          ]);
        }
      }
    }
  }
  console.log('Joined data:', rowAndItemNameAndDailyPricesAndNumberOfPeople);
}

function getItemNameAndRow_(
  values: string[][],
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): Array<[row: number, major: string, minor: string]> {
  const itemNames: Array<[row: number, major: string, minor: string]> = [];

  for (let i = 1; i < values.length; i++) {
    // skip header row
    const row = i + 1;
    let major = values[i][0];
    const minor = values[i][1];
    // A列が空白なら一つ前のmajorを引き継ぐ
    if (!major && itemNames.length > 0) {
      // itemNamesの最後のmajorを取得
      const prevMajor = itemNames[itemNames.length - 1][1];
      // majorを上書き
      major = prevMajor;
    }
    const rule = inputSheet.getRange(row, 2).getDataValidation();

    if (
      rule &&
      rule.getCriteriaType() ===
        SpreadsheetApp.DataValidationCriteria.VALUE_IN_LIST
    ) {
      const options = rule.getCriteriaValues()[0] as string[];
      for (const option of options) {
        itemNames.push([row, major, option]);
      }
    } else {
      itemNames.push([row, major, minor]);
    }
  }
  // B列（minor）が空白のレコードを除外
  return itemNames.filter(([, , minor]) => minor && minor.trim() !== '');
}
function getDailyUnitPriceAndRow_(
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): [row: number, value: number][] {
  const targetCol = 19;
  const lastRow = inputSheet.getLastRow();
  const result: Array<[row: number, value: string]> = [];
  for (let i = 1; i <= lastRow; i++) {
    const formula = inputSheet.getRange(i, targetCol).getFormula();
    if (formula === '') {
      const value = inputSheet.getRange(i, targetCol).getValue();
      result.push([i, value]);
    } else {
      if (i !== dailyUnitPriceFormulaRow) {
        console.log(`Row ${i} formula: ${formula}`);
      } else {
        const [splitFormula1, splitFormula2] =
          extractLastTwoNumbersFromFormula_(formula);
        dailyUnitPriceArray.push(splitFormula1);
        dailyUnitPriceArray.push(splitFormula2);
      }
    }
  }
  const res: Array<[row: number, value: number]> = [];
  const temp = result.filter(([_, value]) => value !== '');
  for (const [row, value] of temp) {
    res.push([row, Number(value)]);
  }
  return res;
}
function getNumberOfPeopleAndRow_(
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): [row: number, value: string][] {
  const targetCol = 21;
  const lastRow = inputSheet.getLastRow();
  const result: Array<[row: number, value: string]> = [];
  for (let i = 1; i <= lastRow; i++) {
    const formula = inputSheet.getRange(i, targetCol).getFormula();
    if (formula === '') {
      const value = inputSheet.getRange(i, targetCol).getValue();
      result.push([i, value]);
    } else {
      if (!numberOfPeopleFormulaRows.includes(i)) {
        console.log(`Row ${i} formula: ${formula}`);
      } else {
        const [splitFormula1, splitFormula2] =
          extractLastTwoNumbersFromFormula_(formula);
        numberOfPeopleArray.push([i, [splitFormula1, splitFormula2]]);
      }
    }
  }
  // valueが空白のレコードを削除
  return result.filter(([, value]) => value !== '');
}
function getNumberOfDaysAndRow_(
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): [row: number, value: string][] {
  const targetCol = 20;
  const lastRow = inputSheet.getLastRow();
  const result: Array<[row: number, value: string]> = [];
  for (let i = 1; i <= lastRow; i++) {
    const formula = inputSheet.getRange(i, targetCol).getFormula();
    if (formula === '') {
      const value = inputSheet.getRange(i, targetCol).getValue();
      result.push([i, value]);
    } else {
      if (!numberOfDaysFormulaRows.includes(i)) {
        console.log(`Row ${i} formula: ${formula}`);
      } else {
        const [splitFormula1, splitFormula2] =
          extractLastTwoNumbersFromFormula_(formula);
        numberOfPeopleArray.push([i, [splitFormula1, splitFormula2]]);
      }
    }
  }
  // valueが空白のレコードを削除
  return result.filter(([, value]) => value !== '');
}
/**
 * Parses a formula string, splits by ',', and returns the last two numeric values.
 * @param formula The formula string to parse.
 * @returns [secondLast: number, last: number]
 * @throws Error if the extracted values are not numbers.
 */
function extractLastTwoNumbersFromFormula_(formula: string): [number, number] {
  const parts = formula.split(',');
  if (parts.length < 2) {
    throw new Error('Formula does not contain enough comma-separated values.');
  }
  // Remove trailing ')' from the last part if present
  const lastRaw = parts[parts.length - 1].replace(/\)/g, '').trim();
  const secondLastRaw = parts[parts.length - 2].trim();
  const last = Number(lastRaw);
  const secondLast = Number(secondLastRaw);
  if (isNaN(secondLast) || isNaN(last)) {
    throw new Error('Extracted values are not valid numbers.');
  }
  return [secondLast, last];
}
