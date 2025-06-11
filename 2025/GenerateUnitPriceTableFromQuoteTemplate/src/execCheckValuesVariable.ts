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
  coefficientSheetNameMap,
  getSpreadsheetByProperty_,
  compareValues_,
  variableSheetNameMap,
} from './common';
import {
  variable1_2015_10,
  variable1_2015_15,
  variable3_2015_10,
  variable3_2015_15,
} from './variablesConst';

export function execCheckValuesVariable_(year: string): boolean {
  const targetProperty = `OUTPUT_SPREADSHEET_${year}`;
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet =
    getSpreadsheetByProperty_(targetProperty);

  const compareValues: Map<string, string[][]> = new Map();
  if (year === '2015') {
    compareValues.set('coefficient10_1', variable1_2015_10);
    compareValues.set('coefficient15_1', variable1_2015_15);
    compareValues.set('coefficient10_3', variable3_2015_10);
    compareValues.set('coefficient15_3', variable3_2015_15);
  } else if (year === '2025') {
    compareValues.set('coefficient10', variable1_2015_15);
    compareValues.set('coefficient15', variable1_2015_15);
  } else {
    throw new Error(`Unsupported year: ${year}`);
  }
  const targetSheetNames: string[] = Array.from(variableSheetNameMap.values());
  coefficientSheetNameMap.forEach((sheetName, key) => {
    targetSheetNames.forEach((targetSheetName, idx) => {
      const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
        ss.getSheetByName(`${targetSheetName}_${sheetName}`);

      if (!sheet) {
        throw new Error(
          `Sheet ${targetSheetName}_${sheetName} not found in spreadsheet.`
        );
      }
      const inputValues: string[][] = sheet
        .getDataRange()
        .getValues() as string[][];
      const compareKey = idx === 0 ? `${key}_1` : `${key}_3`;
      const compareValue: string[][] | undefined =
        compareValues.get(compareKey);
      if (!compareValue) {
        throw new Error(`No compare values found for key: ${compareKey}`);
      }
      const result: boolean = compareValues_(inputValues, compareValue);
      if (result) {
        console.log(`Values match for ${sheetName} (${compareKey})`);
      }
    });
  });
  console.log(`All values checked for year ${year}.`);
  return true; // 全てのチェックが成功した場合はtrueを返す
}
