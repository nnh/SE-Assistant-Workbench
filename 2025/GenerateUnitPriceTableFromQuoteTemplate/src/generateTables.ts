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
  removeCommasAndSpaces_,
  variableSheetNameMap,
  writeOutputSheet_,
  filterOutputRow_,
} from './common';
import { generateUnitPriceTableFromQuoteTemplate_ } from './generateUnitPriceTableFromQuoteTemplate';
import { execCheckValues_ } from './execCheckValues';
import { execCheckValuesVariable_ } from './execCheckValuesVariable';
import {
  variable1_2015_10,
  variable1_2015_15,
  variable3_2015_10,
  variable3_2015_15,
  variable1_2025_10,
  variable1_2025_15,
  variable3_2025_10,
  variable3_2025_15,
} from './variablesConst';
import { convertPriceFrom2015To2025_ } from './forTest_coefficient_10_2025';

class UnitPriceTableGenerator {
  inputSpreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  outputSpreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  year: string;

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
    const sheet1: GoogleAppsScript.Spreadsheet.Sheet | null =
      this.outputSpreadSheet.getSheetByName('シート1');
    if (sheet1) {
      sheet1.hideSheet();
    }
  }
  createSheet(): void {
    generateUnitPriceTableFromQuoteTemplate_(
      this.inputSpreadSheet,
      this.outputSpreadSheet
    );
  }
  createTargetOutputSheetNameMap(sheetName: string): Map<string, string> {
    const sheetNameMap = new Map<string, string>();
    coefficientSheetNameMap.forEach((value, key) => {
      sheetNameMap.set(key, `${sheetName}_${value}`);
    });
    return sheetNameMap;
  }
  createVariableCreateDatabasePriceSheet(
    targetSheetName: string,
    targetValues: string[][],
    columnWidths: number[],
    priceColumnIndexes: number[]
  ): void {
    const outputSheet = getAndClearOutputSheet_(
      this.outputSpreadSheet,
      targetSheetName
    );
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
      setNumberFormatForColumn_(outputSheet, colIndex + 1, targetValues.length);
    });
  }
  createCreateDatabasePriceSheet_(
    targetSheetName: string,
    values: string[][]
  ): void {
    this.createVariableCreateDatabasePriceSheet(
      targetSheetName,
      values,
      [100, 240, 140],
      [1, 2]
    );
  }
  createCentralMonitoringPriceSheet_(
    targetSheetName: string,
    values: string[][]
  ): void {
    this.createVariableCreateDatabasePriceSheet(
      targetSheetName,
      values,
      [100, 100, 325, 140, 140],
      [2, 3]
    );
  }
  editInputCreateDatabaseValues_(coefficient10Values: string[][]): string[][] {
    const createDatabaseValues = coefficient10Values.map(
      ([crfCount, var1, var2], idx) => {
        if (idx === 0) {
          // ヘッダー行はそのまま返す
          return [crfCount, var1, var2];
        }
        const var1Number = Number(removeCommasAndSpaces_(var1));
        const var2Number = Number(removeCommasAndSpaces_(var2));
        return [crfCount, String(var1Number), String(var2Number)];
      }
    );
    return createDatabaseValues;
  }
  getVariableSheetNames_(): string[] {
    const sheetNames: string[] = [];
    variableSheetNameMap.forEach(variableValue => {
      coefficientSheetNameMap.forEach(coefficientValue => {
        sheetNames.push(`${variableValue}_${coefficientValue}`);
      });
    });
    return sheetNames;
  }

  execCheckValues(): void {
    const result = execCheckValues_(this.year);
    console.log(`Check values for ${this.year}: ${result}`);
    const resultVariable1 = execCheckValuesVariable_(this.year);
    console.log(`Check variable1 values for ${this.year}: ${resultVariable1}`);
  }
  createVariableSheet(variableValues: string[][][]): void {
    const sheetNames = this.getVariableSheetNames_();
    this.createCreateDatabasePriceSheet_(sheetNames[0], variableValues[0]);
    this.createCreateDatabasePriceSheet_(sheetNames[1], variableValues[1]);
    this.createCentralMonitoringPriceSheet_(sheetNames[2], variableValues[2]);
    this.createCentralMonitoringPriceSheet_(sheetNames[3], variableValues[3]);
  }
}

export class UnitPriceTableGenerator2015 extends UnitPriceTableGenerator {
  constructor() {
    super('INPUT_SPREADSHEET_2015', 'OUTPUT_SPREADSHEET_2015', '2015');
  }
  execCreateSheet(): void {
    this.createVariableSheet([
      variable1_2015_10,
      variable1_2015_15,
      variable3_2015_10,
      variable3_2015_15,
    ]);
    this.createSheet();
  }
}

export class UnitPriceTableGenerator2025 extends UnitPriceTableGenerator {
  constructor() {
    super('INPUT_SPREADSHEET_2025', 'OUTPUT_SPREADSHEET_2025', '2025');
  }
  createSheet(): void {
    const coefficient2025Map: Map<string, string[][]> =
      convertPriceFrom2015To2025_();
    coefficient2025Map.forEach((values, coefficient) => {
      const targetSheetName = coefficientSheetNameMap.get(coefficient);
      if (!targetSheetName) {
        throw new Error(`Target sheet name for ${coefficient} not found.`);
      }
      const filteredValues = filterOutputRow_(values);
      writeOutputSheet_(
        this.outputSpreadSheet,
        targetSheetName,
        filteredValues
      );
    });
  }
  execCreateSheet(): void {
    this.createVariableSheet([
      variable1_2025_10,
      variable1_2025_15,
      variable3_2025_10,
      variable3_2025_15,
    ]);
    this.createSheet();
  }
}
