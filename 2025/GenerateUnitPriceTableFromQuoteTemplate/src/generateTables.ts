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
  getSpreadsheetByProperty_,
  getAndClearOutputSheet_,
  coefficientSheetNameMap,
  setNumberFormatForColumn_,
  roundToNearest100_,
} from './common';
import { generateUnitPriceTableFromQuoteTemplate_ } from './generateUnitPriceTableFromQuoteTemplate';
import { execCheckValues_ } from './execCheckValues';
import { execCheckValuesVariable_ } from './execCheckValuesVariable';

class UnitPriceTableGenerator {
  inputSpreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  outputSpreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  year: string;
  outputSheetNames: Map<string, string>;

  constructor(
    inputSpreadsheetIdProperty: string,
    outputSpreadsheetIdProperty: string,
    year: string
  ) {
    this.inputSpreadSheet = getSpreadsheetByProperty_(
      inputSpreadsheetIdProperty
    );
    this.outputSpreadSheet = getSpreadsheetByProperty_(
      outputSpreadsheetIdProperty
    );
    this.year = year;
    this.outputSheetNames = new Map([
      ['createDatabase', '変動*1,2'],
      ['centralMonitoring', '変動*3,4'],
    ]);
  }
  createSheet(): void {
    generateUnitPriceTableFromQuoteTemplate_(
      this.inputSpreadSheet,
      this.outputSpreadSheet
    );
    const sheet1: GoogleAppsScript.Spreadsheet.Sheet | null =
      this.outputSpreadSheet.getSheetByName('シート1');
    if (sheet1) {
      sheet1.hideSheet();
    }
  }
  createTargetOutputSheetNameMap(sheetName: string): Map<string, string> {
    const sheetNameMap = new Map<string, string>();
    coefficientSheetNameMap.forEach((value, key) => {
      sheetNameMap.set(key, `${sheetName}_${value}`);
    });
    return sheetNameMap;
  }
  createVariableCreateDatabasePriceSheet(
    sheetName: string,
    values: string[][],
    columnWidths: number[],
    priceColumnIndexes: number[]
  ): void {
    // 係数1, 係数1.5でシートを分ける
    const targetSheetNameMap: Map<string, string> =
      this.createTargetOutputSheetNameMap(sheetName);
    targetSheetNameMap.forEach((targetSheetName: string, key: string) => {
      const outputSheet = getAndClearOutputSheet_(
        this.outputSpreadSheet,
        targetSheetName
      );
      const targetValues: string[][] = values.map((row, idx) => {
        if (idx === 0) {
          // ヘッダー行はそのまま返す
          return row;
        }
        return row.map((value, index) => {
          if (priceColumnIndexes.includes(index)) {
            // 係数1.5の場合は値を変換
            if (key === 'coefficient15') {
              // 指定されたindexの価格を1.5倍に変換
              return String(
                roundToNearest100_(Math.round(Number(value) * 1.5))
              );
            } else {
              return roundToNearest100_(Number(value)).toString();
            }
          } else {
            // 価格以外の値はそのまま返す
            return value;
          }
        });
      });
      outputSheet
        .getRange(1, 1, targetValues.length, targetValues[0].length)
        .setValues(targetValues);
      // 列幅を設定
      if (columnWidths && columnWidths.length > 0) {
        for (let i = 0; i < columnWidths.length; i++) {
          outputSheet.setColumnWidth(i + 1, columnWidths[i]);
        }
      }
      // 数値フォーマットを設定
      priceColumnIndexes.forEach((colIndex: number) => {
        setNumberFormatForColumn_(
          outputSheet,
          colIndex + 1,
          targetValues.length
        );
      });
    });
  }
  createCreateDatabasePriceSheet_(values: string[][]): void {
    const targetSheetName: string =
      this.outputSheetNames.get('createDatabase')!;
    if (!targetSheetName) {
      throw new Error('Output sheet name for createDatabase is not defined.');
    }
    this.createVariableCreateDatabasePriceSheet(
      targetSheetName,
      values,
      [100, 240, 140],
      [1, 2]
    );
  }
  createCentralMonitoringPriceSheet_(values: string[][]): void {
    this.createVariableCreateDatabasePriceSheet(
      this.outputSheetNames.get('centralMonitoring')!,
      values,
      [100, 100, 325, 140, 140],
      [2, 3]
    );
  }

  execCheckValues(): void {
    const result = execCheckValues_(this.year);
    console.log(`Check values for ${this.year}: ${result}`);
    const resultVariable1 = execCheckValuesVariable_(this.year);
    console.log(`Check variable1 values for ${this.year}: ${resultVariable1}`);
  }
}

export class UnitPriceTableGenerator2015 extends UnitPriceTableGenerator {
  constructor() {
    super('INPUT_SPREADSHEET_2015', 'OUTPUT_SPREADSHEET_2015', '2015');
  }
  createCreateDatabasePriceSheet(): void {
    const values: string[][] = [
      ['CRF項目数', 'DB作成・eCRF作成・バリデーション', 'バリデーション報告書'],
      ['50', '325000', '12500'],
      ['100', '550000', '25000'],
      ['500', '1450000', '125000'],
      ['1000', '2575000', '250000'],
      ['2000', '3675000', '500000'],
    ];
    this.createCreateDatabasePriceSheet_(values);
  }
  createCentralMonitoringPriceSheet(): void {
    const trialTypeArray = [
      ['1', '観察研究・レジストリ'],
      ['2', '介入研究（特定臨床研究以外）'],
      ['3', '特定臨床研究'],
      ['5', '医師主導治験・先進'],
    ];
    const inputValues = [
      [
        '症例数',
        'CRF項目数',
        '試験種別係数',
        'ロジカルチェック、マニュアルチェック、クエリ対応',
        'データクリーニング',
      ],
      // B28 = 10
      ['10', '100', '1', '44000', '150000'],
      ['10', '100', '2', '89000', '300000'],
      ['10', '100', '3', '133000', '450000'],
      ['10', '100', '5', '222000', '750000'],
      ['10', '500', '1', '75000', '202000'],
      ['10', '500', '2', '151000', '405000'],
      ['10', '500', '3', '226000', '607000'],
      ['10', '500', '5', '377000', '1012000'],
      ['10', '1000', '1', '89000', '225000'],
      ['10', '1000', '2', '178000', '450000'],
      ['10', '1000', '3', '267000', '675000'],
      ['10', '1000', '5', '445000', '1125000'],
      ['10', '2000', '1', '103000', '248000'],
      ['10', '2000', '2', '206000', '495000'],
      ['10', '2000', '3', '309000', '743000'],
      ['10', '2000', '5', '515000', '1238000'],
      // B28 = 50
      ['50', '100', '1', '33000', '255000'],
      ['50', '100', '2', '66000', '510000'],
      ['50', '100', '3', '99000', '765000'],
      ['50', '100', '5', '165000', '1275000'],
      ['50', '500', '1', '56000', '344000'],
      ['50', '500', '2', '112000', '688000'],
      ['50', '500', '3', '168000', '1032000'],
      ['50', '500', '5', '280000', '1720000'],
      ['50', '1000', '1', '66000', '382000'],
      ['50', '1000', '2', '133000', '765000'],
      ['50', '1000', '3', '199000', '1147000'],
      ['50', '1000', '5', '331000', '1912000'],
      ['50', '2000', '1', '77000', '421000'],
      ['50', '2000', '2', '153000', '842000'],
      ['50', '2000', '3', '230000', '1263000'],
      ['50', '2000', '5', '383000', '2105000'],
      // B28 = 100
      ['100', '100', '1', '30000', '300000'],
      ['100', '100', '2', '60000', '600000'],
      ['100', '100', '3', '90000', '900000'],
      ['100', '100', '5', '151000', '1500000'],
      ['100', '500', '1', '51000', '405000'],
      ['100', '500', '2', '102000', '810000'],
      ['100', '500', '3', '153000', '1214000'],
      ['100', '500', '5', '255000', '2024000'],
      ['100', '1000', '1', '60000', '450000'],
      ['100', '1000', '2', '121000', '900000'],
      ['100', '1000', '3', '181000', '1350000'],
      ['100', '1000', '5', '302000', '2250000'],
      ['100', '2000', '1', '70000', '495000'],
      ['100', '2000', '2', '139000', '991000'],
      ['100', '2000', '3', '209000', '1486000'],
      ['100', '2000', '5', '348000', '2477000'],
    ];
    const mergedValues: string[][] = inputValues.map(row => {
      if (row === inputValues[0]) {
        // ヘッダー行: 試験種別係数を削除し、試験種別名を追加
        const newHeader = [...row.slice(0, 2), ...row.slice(3)];
        return newHeader.concat('試験種別名');
      }
      const trialType = trialTypeArray.find(type => type[0] === row[2]);
      const trialTypeName = trialType ? trialType[1] : '';
      // row[2]（試験種別係数）を削除して試験種別名を追加
      const newRow = [...row.slice(0, 2), ...row.slice(3)];
      return newRow.concat(trialTypeName);
    });
    this.createCentralMonitoringPriceSheet_(mergedValues);
  }
  execCreateSheet(): void {
    this.createCreateDatabasePriceSheet();
    this.createCentralMonitoringPriceSheet();
    this.createSheet();
  }
}
