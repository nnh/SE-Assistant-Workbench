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
const variantRowAndTextMap: Map<number, string> = new Map([
  [34, '(変動 ※1)'],
  [35, '(変動 ※2)'],
  [39, '(変動 ※3)'],
  [40, '(変動 ※4)'],
]);
const priceBydayRowAndTextMap: Map<number, string> = new Map([[34, '図1参照']]);
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
  for (let i = 0; i < itemsCoef10Data.length; i++) {
    const [priceByday, day, person] = itemsPriceByDayAndDayAndPersonValue[i];
    const itemCoef10 = extractItemData_(itemsCoef10Data[i]);
    // priceLogic
    const priceLogicRow = priceLogicData[i];
    const itemCoef10WithExtras = {
      ...itemCoef10,
      priceByday: priceByday ?? '',
      day: day ?? '',
      person: person ?? '',
    };
    varidatePriceLogicRow_(i, priceLogicRow, itemCoef10WithExtras);
    // PriceLogicCompany
    const itemCoef15 = extractItemData_(itemsCoef15Data[i]);
    const priceLogicCompanyRow = priceLogicCompanyData[i];
    const itemCoef15WithExtras = {
      ...itemCoef15,
      priceByday: priceByday ?? '',
      day: day ?? '',
      person: person ?? '',
    };
    varidatePriceLogicRow_(i, priceLogicCompanyRow, itemCoef15WithExtras);
  }
  // 93行目以降は固定値
  const staticItemMap: Map<GoogleAppsScript.Spreadsheet.Sheet, string[][]> =
    new Map([
      [priceLogicCompanySheet, priceLogicCompanyStaticTextArray],
      [priceLogicSheet, priceLogicStaticTextArray],
    ]);
  const checkTiaiSheet: GoogleAppsScript.Spreadsheet.Sheet[] = Array.from(
    staticItemMap.keys()
  );
  checkTiaiSheet.forEach(sheet => {
    checkTiaiText_(sheet);
  });
  const staticTextStartRow = 96;
  staticItemMap.forEach((staticTextArray, sheet) => {
    sheet
      .getRange(`A${staticTextStartRow}:F126`)
      .getValues()
      .forEach((row, index) => {
        row.forEach((cell, cellIndex) => {
          if (String(cell) !== String(staticTextArray[index][cellIndex])) {
            throw new Error(
              `PriceLogicCompany static text mismatch at row ${index + staticTextStartRow}, column ${cellIndex + 1}: ` +
                `Expected "${String(staticTextArray[index][cellIndex])}", but got "${String(cell)}".`
            );
          }
        });
      });
  });
  console.log(
    'Items, PriceLogic, PriceLogicCompany sheets match successfully.'
  );
}
function varidatePriceLogicRow_(
  i: number,
  priceLogicRow: string[],
  itemCoef: {
    major: string;
    minor: string;
    baseprice: string;
    unit: string;
    priceByday: string;
    day: string;
    person: string;
  }
): void {
  if (itemCoef.major !== priceLogicRow[0]) {
    throw new Error(
      `PriceLogic major mismatch at row ${i + itemValueStartRow}: ` +
        `Expected ${itemCoef.major}, but got ${priceLogicRow[0]}.`
    );
  }
  if (itemCoef.minor !== priceLogicRow[1]) {
    throw new Error(
      `PriceLogic minor mismatch at row ${i + itemValueStartRow}: ` +
        `Expected ${itemCoef.minor}, but got ${priceLogicRow[1]}.`
    );
  }
  if (itemCoef.baseprice !== priceLogicRow[2]) {
    if (priceLogicRow[2] !== variantRowAndTextMap.get(i)) {
      throw new Error(
        `PriceLogic baseprice mismatch at row ${i + itemValueStartRow}: ` +
          `Expected ${itemCoef.baseprice}, but got ${priceLogicRow[2]}.`
      );
    }
  }
  if (itemCoef.unit !== priceLogicRow[3]) {
    throw new Error(
      `PriceLogic unit mismatch at row ${i + itemValueStartRow}: ` +
        `Expected ${itemCoef.unit}, but got ${priceLogicRow[3]}.`
    );
  }
  if (itemCoef.priceByday !== priceLogicRow[4]) {
    if (priceLogicRow[4] !== priceBydayRowAndTextMap.get(i)) {
      throw new Error(
        `PriceLogic priceByday mismatch at row ${i + itemValueStartRow}: ` +
          `Expected ${itemCoef.priceByday}, but got ${priceLogicRow[4]}.`
      );
    }
  }
  if (itemCoef.day !== priceLogicRow[5]) {
    throw new Error(
      `PriceLogic day mismatch at row ${i + itemValueStartRow}: ` +
        `Expected ${itemCoef.day}, but got ${priceLogicRow[5]}.`
    );
  }
  if (itemCoef.person !== priceLogicRow[6]) {
    throw new Error(
      `PriceLogic person mismatch at row ${i + itemValueStartRow}: ` +
        `Expected ${itemCoef.person}, but got ${priceLogicRow[6]}.`
    );
  }
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
  checkTiaiText_(priceSheet);
  console.log('All items and prices match successfully.');
}
function checkTiaiText_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  rangeAddress = 'A93:A95'
): void {
  const tiaiTextArray = [
    ['*2015年の第3次産業活動指数を基準に単価を調整'],
    ['*1 2015年の第3次産業活動指数：100'],
    ['*2 2025年の第3次産業活動指数：107'],
  ];
  const tiaiText = sheet
    .getRange(rangeAddress)
    .getValues()
    .map(row => row[0]);
  tiaiText.forEach((text, index) => {
    if (text !== tiaiTextArray[index][0]) {
      throw new Error(
        `Tiai text mismatch at row ${index + 93}: Expected "${tiaiTextArray[index][0]}", but got "${text}".`
      );
    }
  });
}
const priceLogicStaticTextArray = [
  ['', '', '', '', '', '', ''],
  ['※1:', '', '表1 試験種類に対する係数（※2, ※3のみに適用）', '', '', '', ''],
  ['', '', '試験種類', '', '', '係数', ''],
  ['項目数', '価格', '観察研究・レジストリ', '', '', '1', ''],
  ['0', '107000', '介入研究', '', '', '2', ''],
  ['100', '589000', '特定臨床研究', '', '', '3', ''],
  ['1000', '2755000', '医師主導治験', '', '', '5', ''],
  ['2000', '3932000', '表2 単価(1人日)基準', '', '', '', ''],
  ['3000', '5109000', '単価(1人日)', '基準', '', '', ''],
  ['', '', '53500', 'DM・試験事務局担当が従事', '', '', ''],
  ['', '', '69550', 'シニアDM・シニア試験事務局担当が従事', '', '', ''],
  ['', '', '85600', 'STAT・エンジニアが従事', '', '', ''],
  ['', '', '107000', '医師が従事', '', '', ''],
  [
    '※2: (CRF項目数)×250*1.07',
    '',
    '但し、プロトコル等作成支援と研究結果報告業務は従事者平均単価',
    '',
    '',
    '',
    '',
  ],
  [
    '※3: log(10+ log2(症例数))(症例数)×log10(CRF項目数)×(係数(表1参照))×25000*1.07',
    '',
    '人単価には間接経費が含まれています',
    '',
    '',
    '',
    '',
  ],
  [
    '※4: log10(症例数)×log10(CRF項目数)×(係数(表1参照))×75000*1.07',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
  ['※5: 下記項目の金額合計の10%', '', '', '', '', '', ''],
  ['・プロトコル等作成支援', '', '', '', '', '', ''],
  ['・薬事戦略相談支援', '', '', '', '', '', ''],
  ['・競争的資金獲得支援', '', '', '', '', '', ''],
  ['・プロジェクト管理', '', '', '', '', '', ''],
  ['・試験事務局業務', '', '', '', '', '', ''],
  ['・モニタリング業務', '', '', '', '', '', ''],
  ['・データベース管理', '', '', '', '', '', ''],
  ['・データマネジメント業務', '', '', '', '', '', ''],
  ['・安全性管理業務', '', '', '', '', '', ''],
  ['・統計解析業務', '', '', '', '', '', ''],
  ['・研究結果報告書業務', '', '', '', '', '', ''],
  ['・監査業務', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  [
    '基準単価の設定根拠は 単価(1人日) ×日数×人数 としているが、試験毎に変動するものではない。',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
];
const priceLogicCompanyStaticTextArray = [
  ['', '', '', '', '', '', ''],
  ['※1:', '', '表1 試験種類に対する係数（※2, ※3のみに適用）', '', '', '', ''],
  ['', '', '試験種類', '', '', '係数', ''],
  ['項目数', '価格', '観察研究・レジストリ', '', '', '1', ''],
  ['0', '161000', '介入研究', '', '', '2', ''],
  ['100', '884000', '特定臨床研究', '', '', '3', ''],
  ['1000', '4133000', '医師主導治験・先進', '', '', '5', ''],
  ['2000', '5898000', '表2 主担当者単価(1人日)基準', '', '', '', ''],
  ['3000', '7664000', '単価(1人日)', '基準', '', '', ''],
  ['', '', '80250', 'DM・試験事務局担当が従事', '', '', ''],
  ['', '', '104325', 'シニアDM・シニア試験事務局担当が従事', '', '', ''],
  ['', '', '128400', 'STAT・エンジニアが従事', '', '', ''],
  ['', '', '160500', '医師が従事', '', '', ''],
  [
    '※2: (CRF項目数)×375*1.07',
    '',
    '但し、プロトコル等作成支援と研究結果報告業務は従事者平均単価',
    '',
    '',
    '',
    '',
  ],
  [
    '※3: log(10+ log2(症例数))(症例数)×log10(CRF項目数)×(係数(表1参照))×37,500*1.07',
    '',
    '主担当者単価には間接経費が含まれています',
    '',
    '',
    '',
    '',
  ],
  [
    '※4: log10(症例数)×log10(CRF項目数)×(係数(表1参照))×112,500*1.07',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
  ['※5: 下記項目の金額合計の10%', '', '', '', '', '', ''],
  ['・プロトコル等作成支援', '', '', '', '', '', ''],
  ['・薬事戦略相談支援', '', '係数', '1.5', '', '', ''],
  ['・競争的資金獲得支援', '', '', '', '', '', ''],
  ['・プロジェクト管理', '', '', '', '', '', ''],
  ['・試験事務局業務', '', '', '', '', '', ''],
  ['・モニタリング業務', '', '', '', '', '', ''],
  ['・データベース管理', '', '', '', '', '', ''],
  ['・データマネジメント業務', '', '', '', '', '', ''],
  ['・安全性管理業務', '', '', '', '', '', ''],
  ['・統計解析業務', '', '', '', '', '', ''],
  ['・研究結果報告書業務', '', '', '', '', '', ''],
  ['・監査業務', '', '', '', '', '', ''],
  ['', '', '', '', '', '', ''],
  [
    '基準単価の設定根拠は 単価(1人日) ×日数×人数 としているが、試験毎に変動するものではない。',
    '',
    '',
    '',
    '',
    '',
    '',
  ],
];
