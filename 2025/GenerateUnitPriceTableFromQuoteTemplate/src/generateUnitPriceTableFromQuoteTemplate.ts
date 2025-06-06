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
const numberOfDaysFormulaRows = [14, 15, 16, 40, 52, 53, 55, 58];
const dailyUnitPriceArray: number[] = [];
const numberOfPeopleArray: [row: number, value: number[]][] = [];
const numberOfDaysArray: [row: number, value: number[]][] = [];
const outputRowMap: Map<string, number> = new Map([
  ['major', 0],
  ['minor', 1],
  ['price', 2],
  ['basePrice', 17],
  ['unitPrice', 18],
]);

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
  // rowAndItemNameAndDailyPricesAndNumberOfPeopleとnumberOfDaysをrowをキーにして多対多の結合
  const rowAndItemNameAndDailyPricesAndNumberOfPeopleAndDays: Array<
    [
      row: number,
      major: string,
      minor: string,
      unitPrice: number,
      numberOfPeople: number,
      numberOfDays: number,
    ]
  > = [];
  for (const [
    row,
    major,
    minor,
    unitPrice,
    numberOfPeople,
  ] of rowAndItemNameAndDailyPricesAndNumberOfPeople) {
    if (numberOfDaysFormulaRows.includes(row)) {
      const targetIndex: number = numberOfDaysFormulaRows.indexOf(row);
      const targetValueArray: number[] = numberOfDaysArray[targetIndex][1];
      let numberOfDays: number;
      if (row === numberOfDaysFormulaRows[0]) {
        numberOfDays =
          minor === 'ミーティング準備・実行' ||
          minor === 'キックオフミーティング準備・実行'
            ? targetValueArray[0]
            : targetValueArray[1];
      } else if (row === numberOfDaysFormulaRows[1]) {
        numberOfDays =
          minor === '症例検討会準備・実行'
            ? targetValueArray[0]
            : targetValueArray[1];
      } else if (row === numberOfDaysFormulaRows[2]) {
        numberOfDays =
          minor === 'CTR登録案' ? targetValueArray[0] : targetValueArray[1];
      } else if (row === numberOfDaysFormulaRows[3]) {
        numberOfDays =
          minor === 'IRB承認確認'
            ? 0.04
            : minor === '初期アカウント設定（施設・ユーザー）'
              ? targetValueArray[0]
              : targetValueArray[1];
      } else if (row === numberOfDaysFormulaRows[4]) {
        numberOfDays =
          minor === '統計解析計画書作成'
            ? 5
            : minor === '統計解析計画書・出力計画書作成'
              ? targetValueArray[0]
              : targetValueArray[1];
      } else if (row === numberOfDaysFormulaRows[5]) {
        numberOfDays =
          minor === '中間解析プログラム作成、解析実施（ダブル）'
            ? targetValueArray[0]
            : targetValueArray[1];
      } else if (row === numberOfDaysFormulaRows[6]) {
        numberOfDays =
          minor === '最終解析プログラム作成、解析実施（シングル）'
            ? targetValueArray[0]
            : targetValueArray[1];
      } else if (row === numberOfDaysFormulaRows[7]) {
        numberOfDays =
          minor === 'CSRの作成支援' ? targetValueArray[0] : targetValueArray[1];
      } else {
        console.warn(`Row ${row} is not in numberOfDaysFormulaRows.`);
        numberOfDays = -1;
      }
      rowAndItemNameAndDailyPricesAndNumberOfPeopleAndDays.push([
        row,
        major,
        minor,
        unitPrice,
        numberOfPeople,
        numberOfDays,
      ]);
    } else {
      for (const [daysRow, numberOfDaysValue] of numberOfDays) {
        if (row === daysRow) {
          rowAndItemNameAndDailyPricesAndNumberOfPeopleAndDays.push([
            row,
            major,
            minor,
            unitPrice,
            numberOfPeople,
            Number(numberOfDaysValue),
          ]);
        }
      }
    }
  }
  // itemNamesとrowAndItemNameAndDailyPricesAndNumberOfPeopleAndDaysでitemNamesの全ての要素をキーにして左結合する
  const itemsAndpriceAndPeopleAndDay: Array<
    [
      row: number,
      major: string,
      minor: string,
      unitPrice: number,
      numberOfPeople: number,
      numberOfDays: number,
    ]
  > = [];
  for (const [row, major, minor] of itemNames) {
    const found = rowAndItemNameAndDailyPricesAndNumberOfPeopleAndDays.find(
      item => item[0] === row && item[1] === major && item[2] === minor
    );
    if (found) {
      itemsAndpriceAndPeopleAndDay.push(found);
    } else {
      // foundがなかった場合はunitPrice, numberOfPeople, numberOfDaysを0にして追加
      itemsAndpriceAndPeopleAndDay.push([row, major, minor, 0, 0, 0]);
    }
  }
  // inputSheetから行番号とC列のformula, D列のValue, R列のformulaを取得
  const priceAndUnitAndBasePrice: Array<
    [row: number, price: string, unit: string, basePrice: string]
  > = [];
  for (let i = 1; i <= inputSheet.getLastRow(); i++) {
    const price = inputSheet.getRange(i, 3).getFormula();
    const unit = inputSheet.getRange(i, 4).getValue();
    const basePrice = inputSheet.getRange(i, 18).getFormula();
    if (price || unit || basePrice) {
      priceAndUnitAndBasePrice.push([i, price, unit, basePrice]);
    } else {
      // 空白の行はスキップ
      continue;
    }
  }
  // itemsAndpriceAndPeopleAndDayとpriceAndUnitAndBasePriceをrowをキーにしてleft join
  const itemsAndPriceAndPeopleAndDayAndPrice: Array<
    [
      row: number,
      major: string,
      minor: string,
      unitPrice: number,
      numberOfPeople: number,
      numberOfDays: number,
      price: string,
      unit: string,
      basePrice: string,
    ]
  > = [];
  let rowNumber = 1;
  for (const [
    row,
    major,
    minor,
    unitPrice,
    numberOfPeople,
    numberOfDays,
  ] of itemsAndpriceAndPeopleAndDay) {
    const found = priceAndUnitAndBasePrice.find(item => item[0] === row);
    rowNumber++;
    if (found) {
      // foundの`R${row}`を`R${rowNumber}`に置き換える
      found[1] = found[1].replace(/R\d+/, `R${rowNumber}`);
      found[3] = found[3].replace(/S\d+/, `S${rowNumber}`);
      found[3] = found[3].replace(/T\d+/, `T${rowNumber}`);
      found[3] = found[3].replace(/U\d+/, `U${rowNumber}`);
      itemsAndPriceAndPeopleAndDayAndPrice.push([
        row,
        major,
        minor,
        unitPrice,
        numberOfPeople,
        numberOfDays,
        found[1], // price
        found[2], // unit
        found[3], // basePrice
      ]);
    } else {
      itemsAndPriceAndPeopleAndDayAndPrice.push([
        row,
        major,
        minor,
        unitPrice,
        numberOfPeople,
        numberOfDays,
        '', // price
        '', // unit
        '', // basePrice
      ]);
    }
  }
  // 出力用配列を作成
  const outputRows: string[][] = [];
  // ヘッダー行
  outputRows.push([
    '大項目', // A
    '小項目', // B
    '単価', // C
    '単位', // D
    '行数', // E
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '', // F～Q 空白
    '基準単価', // R
    '単価(1人日)', // S
    '日数', // T
    '人数', // U
  ]);
  for (const [
    row,
    major,
    minor,
    unitPrice,
    numberOfPeople,
    numberOfDays,
    price,
    unit,
    basePrice,
  ] of itemsAndPriceAndPeopleAndDayAndPrice) {
    const outputRow: string[] = [];
    outputRow[outputRowMap.get('major')!] = major; // A
    outputRow[outputRowMap.get('minor')!] = minor; // B
    outputRow[outputRowMap.get('price')!] = price; // C
    outputRow[3] = unit; // D
    outputRow[4] = String(row); // E
    // F～Q 空白
    for (let i = 5; i <= 16; i++) outputRow[i] = '';
    outputRow[outputRowMap.get('basePrice')!] = basePrice; // R
    outputRow[outputRowMap.get('unitPrice')!] = String(unitPrice); // S
    outputRow[19] = String(numberOfDays); // T
    outputRow[20] = String(numberOfPeople); // U
    outputRows.push(outputRow);
  }

  const outputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  outputSheet.clear();
  const outputRowsFiltered = outputRows
    .filter(row => row[outputRowMap.get('major')!] !== '合計')
    .map(row => {
      if (
        row[outputRowMap.get('minor')!] === 'DB作成・eCRF作成・バリデーション'
      ) {
        row[outputRowMap.get('basePrice')!] = '(変動 ※1)';
        row[outputRowMap.get('price')!] = '';
      }
      if (row[outputRowMap.get('minor')!] === 'バリデーション報告書') {
        row[outputRowMap.get('basePrice')!] = '(変動 ※2)';
        row[outputRowMap.get('price')!] = '';
      }
      if (
        row[outputRowMap.get('minor')!] ===
        'ロジカルチェック、マニュアルチェック、クエリ対応'
      ) {
        row[outputRowMap.get('basePrice')!] = '(変動 ※3)';
        row[outputRowMap.get('price')!] = '';
      }
      if (row[outputRowMap.get('minor')!] === 'データクリーニング') {
        row[outputRowMap.get('basePrice')!] = '(変動 ※4)';
        row[outputRowMap.get('price')!] = '';
      }
      if (row[outputRowMap.get('minor')!] === 'プロジェクト管理') {
        row[outputRowMap.get('basePrice')!] = '(変動 ※5)';
        row[outputRowMap.get('price')!] = '';
      }
      return row;
    });

  outputSheet
    .getRange(1, 1, outputRowsFiltered.length, outputRowsFiltered[0].length)
    .setValues(outputRowsFiltered);
  outputSheet.hideColumns(5, 13);
  ['price', 'basePrice', 'unitPrice'].forEach(key => {
    if (outputRowMap.has(key)) {
      const col = outputRowMap.get(key)! + 1;
      setNumberFormatForColumn_(outputSheet, col, outputRowsFiltered.length);
    }
  });
  writeOutputSheet_('Trial参照', outputRowsFiltered);
  const coefficient_10 = replaceCoefficient_(outputRowsFiltered, 1);
  writeOutputSheet_('係数1', coefficient_10);
  const coefficient_15 = replaceCoefficient_(outputRowsFiltered, 1.5);
  writeOutputSheet_('係数1.5', coefficient_15);
  SpreadsheetApp.flush();
}
function replaceCoefficient_(
  inputValues: string[][],
  coefficient: number
): string[][] {
  return inputValues.map(row => {
    const priceCol = outputRowMap.get('price')!;
    if (row[priceCol] && typeof row[priceCol] === 'string') {
      row[priceCol] = row[priceCol].replace(
        /Trial!\$B\$44/g,
        String(coefficient)
      );
    }
    return row;
  });
}
function writeOutputSheet_(outputSheetName: string, values: string[][]) {
  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(outputSheetName);
  const sheet: GoogleAppsScript.Spreadsheet.Sheet = !outputSheet
    ? SpreadsheetApp.getActiveSpreadsheet().insertSheet()
    : outputSheet;
  sheet.setName(outputSheetName);
  sheet.clear();

  sheet.getRange(1, 1, values.length, values[0].length).setValues(values);
  sheet.hideColumns(5, 13);
  ['price', 'basePrice', 'unitPrice'].forEach(key => {
    if (outputRowMap.has(key)) {
      const col = outputRowMap.get(key)! + 1;
      setNumberFormatForColumn_(sheet, col, values.length);
    }
  });
}
/**
 * 指定したシートの列に対して、2行目から最終行まで数値フォーマットを設定する
 * @param sheet 対象のシート
 * @param col 列番号（1始まり）
 * @param lastRow 最終行番号
 */
function setNumberFormatForColumn_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  col: number,
  lastRow: number
) {
  if (lastRow <= 1) return; // データ行がなければ何もしない
  sheet.getRange(2, col, lastRow - 1, 1).setNumberFormat('#,##0_);(#,##0)');
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
        numberOfDaysArray.push([i, [splitFormula1, splitFormula2]]);
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
