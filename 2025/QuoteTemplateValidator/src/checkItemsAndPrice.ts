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
  getSpreadsheetById_,
  copyTemplateSpreadsheetAndSaveId_,
  getSheetBySheetName_,
  trialCoefficientRangeAddress,
} from './commonForTest';
const itemValueStartRow = 3;
const itemValueEndRow = 92;
function getItemsValues_(
  itemsSheet: GoogleAppsScript.Spreadsheet.Sheet
): string[][] {
  const itemsData = itemsSheet
    .getRange(`A${itemValueStartRow}:D${itemValueEndRow}`)
    .getValues();
  return itemsData;
}
function getItemsAndCompareSheet_(
  compareSheetName: string
): GoogleAppsScript.Spreadsheet.Sheet[] {
  const spreadsheetId: string = copyTemplateSpreadsheetAndSaveId_();
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet | null =
    getSpreadsheetById_(spreadsheetId);
  if (!ss) {
    throw new Error('Spreadsheet not found after copying.');
  }
  const itemsSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    ss,
    'Items'
  );
  const priceSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    ss,
    compareSheetName
  );
  return [itemsSheet, priceSheet];
}
function getPriceValues_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet
): string[][] {
  const priceLogicData = sheet.getRange('A2:G91').getValues();
  return priceLogicData;
}
export function checkItemsAndPriceLogic_(): void {
  const [itemsSheet, priceLogicSheet] = getItemsAndCompareSheet_('PriceLogic');
  const priceLogicCompanySheet: GoogleAppsScript.Spreadsheet.Sheet =
    getSheetBySheetName_(itemsSheet.getParent(), 'PriceLogicCompany');
  console.log(
    'ItemsシートとPriceLogic, PriceLogicCompanyシートの一致を確認します。'
  );
  const [itemsCoef10Data, itemsCoef15Data] = getCoffeicientValues_(itemsSheet);
  const priceLogicData = getPriceValues_(priceLogicSheet);
  const priceLogicCompanyData = getPriceValues_(priceLogicCompanySheet);
  const itemsPriceByDayAndDayAndPersonValue: string[][] = itemsSheet
    .getRange(`S${itemValueStartRow}:U${itemValueEndRow}`)
    .getValues();
  const variantRowAndTextMap: Map<number, string> = new Map([
    [34, '(変動 ※1)'],
    [35, '(変動 ※2)'],
    [39, '(変動 ※3)'],
    [40, '(変動 ※4)'],
  ]);
  const priceBydayRowAndTextMap: Map<number, string> = new Map([
    [34, '図1参照'],
  ]);
  for (let i = 0; i < itemsCoef10Data.length; i++) {
    const [priceByday, day, person] = itemsPriceByDayAndDayAndPersonValue[i];
    const itemCoef10 = extractItemData_(itemsCoef10Data[i]);
    const itemCoef15 = extractItemData_(itemsCoef15Data[i]);
    // priceLogicData, priceLogicCompanyData の i 行目を比較
    const priceLogicRow = priceLogicData[i];
    const priceLogicCompanyRow = priceLogicCompanyData[i];
    if (itemCoef10.major !== priceLogicRow[0]) {
      throw new Error(
        `PriceLogic major mismatch at row ${i + itemValueStartRow}: ` +
          `Expected ${itemCoef10.major}, but got ${priceLogicRow[0]}.`
      );
    }
    if (itemCoef10.minor !== priceLogicRow[1]) {
      throw new Error(
        `PriceLogic minor mismatch at row ${i + itemValueStartRow}: ` +
          `Expected ${itemCoef10.minor}, but got ${priceLogicRow[1]}.`
      );
    }
    if (itemCoef10.baseprice !== priceLogicRow[2]) {
      if (priceLogicRow[2] !== variantRowAndTextMap.get(i)) {
        throw new Error(
          `PriceLogic baseprice mismatch at row ${i + itemValueStartRow}: ` +
            `Expected ${itemCoef10.baseprice}, but got ${priceLogicRow[2]}.`
        );
      }
    }
    if (itemCoef10.unit !== priceLogicRow[3]) {
      throw new Error(
        `PriceLogic unit mismatch at row ${i + itemValueStartRow}: ` +
          `Expected ${itemCoef10.unit}, but got ${priceLogicRow[3]}.`
      );
    }
    if (priceByday !== priceLogicRow[4]) {
      if (priceLogicRow[4] !== priceBydayRowAndTextMap.get(i)) {
        throw new Error(
          `PriceLogic priceByday mismatch at row ${i + itemValueStartRow}: ` +
            `Expected ${priceByday}, but got ${priceLogicRow[4]}.`
        );
      }
    }
    if (day !== priceLogicRow[5]) {
      throw new Error(
        `PriceLogic day mismatch at row ${i + itemValueStartRow}: ` +
          `Expected ${day}, but got ${priceLogicRow[5]}.`
      );
    }
    if (person !== priceLogicRow[6]) {
      throw new Error(
        `PriceLogic person mismatch at row ${i + itemValueStartRow}: ` +
          `Expected ${person}, but got ${priceLogicRow[6]}.`
      );
    }
    // PriceLogicCompanyのチェック
  }
  console.log(
    'Items, PriceLogic, PriceLogicCompany sheets match successfully.'
  );
}
function extractItemData_(itemData: string[]): {
  major: string;
  minor: string;
  baseprice: string;
  unit: string;
} {
  const [major, minor, baseprice, unit] = itemData;
  return { major, minor, baseprice, unit };
}
function getCoffeicientValues_(
  itemsSheet: GoogleAppsScript.Spreadsheet.Sheet
): string[][][] {
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet = itemsSheet.getParent();
  const trialSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    ss,
    'Trial'
  );
  const coefficientRange: GoogleAppsScript.Spreadsheet.Range =
    trialSheet.getRange(trialCoefficientRangeAddress);
  coefficientRange.setValue('1');
  SpreadsheetApp.flush();
  const itemsData = getItemsValues_(itemsSheet);
  coefficientRange.setValue('1.5');
  SpreadsheetApp.flush();
  const itemsCoef15Data = getItemsValues_(itemsSheet);
  coefficientRange.setValue('1');
  return [itemsData, itemsCoef15Data];
}
export function checkItemsAndPrice_(): void {
  console.log('ItemsシートとPriceシートの一致を確認します。');
  const [itemsSheet, priceSheet] = getItemsAndCompareSheet_('Price');
  const priceData = getPriceValues_(priceSheet);
  const [itemsData, itemsCoef15Data] = getCoffeicientValues_(itemsSheet);
  for (let i = 0; i < itemsData.length; i++) {
    const {
      major: item_major,
      minor: item_minor,
      baseprice: item_baseprice,
      unit: item_unit,
    } = extractItemData_(itemsData[i]);
    const { baseprice: item_baseprice15 } = extractItemData_(
      itemsCoef15Data[i]
    );
    const [
      price_major,
      price_minor,
      price_baseprice10,
      price_unit10,
      price_baseprice15,
      price_unit15,
      _dummy,
    ] = priceData[i];
    if (price_unit10 !== price_unit15) {
      throw new Error(
        `Price units do not match for item ${item_major} ${item_minor}: ${price_unit10} vs ${price_unit15}.`
      );
    }
    if (item_major !== price_major || item_minor !== price_minor) {
      throw new Error(
        `Item major/minor does not match Price for item ${item_major} ${item_minor}: ${price_major} ${price_minor}.`
      );
    }
    if (item_unit !== price_unit10) {
      throw new Error(
        `Item unit does not match Price for item ${item_major} ${item_minor}: ${item_unit} vs ${price_unit10}.`
      );
    }
    if (item_baseprice !== price_baseprice10) {
      throw new Error(
        `Item base price does not match Price for item ${item_major} ${item_minor}: ${item_baseprice} vs ${price_baseprice10}.`
      );
    }
    if (item_baseprice15 !== price_baseprice15) {
      throw new Error(
        `Item base price with coefficient 1.5 does not match Price for item ${item_major} ${item_minor}: ${item_baseprice15} vs ${price_baseprice15}.`
      );
    }
  }
  console.log('All items and prices match successfully.');
}
