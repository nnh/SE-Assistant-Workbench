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
  setupToClosingSheetNames,
  getSheetBySheetName_,
  setTrialTerms_,
} from './commonForTest';
const projectManagementMajorRow = 12;
const dmMajorRow = 34;
const othersMajorFilterRow = 80;
function getFilterSettingsMajorArray_(): [number, number[]][] {
  const dmfilterSettingsArray = [
    [35, [36, 37]],
    [38, [39, 40, 41, 42]],
    [43, [44, 45]],
    [46, [47, 48]],
  ];
  const filterSettingsMajorArray: [number, number[]][] = [
    [5, [6, 7]],
    [8, [9]],
    [10, [11]],
    [projectManagementMajorRow, [13]],
    [14, [15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26]],
    [27, [28, 29]],
    [30, [31, 32, 33]],
    [dmMajorRow, dmfilterSettingsArray.map(setting => setting[1]).flat()],
    [49, [50, 51]],
    [52, [53, 54, 55, 56, 57]],
    [58, [59]],
    [60, [61, 62, 63]],
    [64, [65, 66, 67]],
    [68, [69, 70, 71]],
    [72, [73, 74]],
    [75, [76, 77]],
    [78, [79]],
    [
      othersMajorFilterRow,
      [81, 82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94],
    ],
  ];
  return filterSettingsMajorArray;
}

export function checkFilterSettings_(): void {
  console.log('各シートのフィルタ設定を確認します。');
  const spreadsheetId: string = copyTemplateSpreadsheetAndSaveId_();
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet | null =
    getSpreadsheetById_(spreadsheetId);
  if (!ss) {
    throw new Error('Spreadsheet not found after copying.');
  }
  const trialSheet = getSheetBySheetName_(ss, 'Trial');
  setTrialTerms_(trialSheet);
  trialSheet.getRange('B28:B30').setValues([[100], [100], [100]]);
  const total1Sheet = getSheetBySheetName_(ss, 'Total');
  const total2Sheet = getSheetBySheetName_(ss, 'Total2');
  const quoteSheet = getSheetBySheetName_(ss, 'Quote');
  const total3Sheet = getSheetBySheetName_(ss, 'Total3');
  const countColumn = 'F';
  const setupToClosingFilterColumn = 'L';
  const total2SheetSumColumn = 'L';
  const total2FilterColumn = 'N';
  const quoteFilterColumn = 'F';
  const filterSettingsMajorArray = getFilterSettingsMajorArray_();
  setupToClosingSheetNames.forEach(sheetName => {
    const sheet = getSheetBySheetName_(ss, sheetName);
    filterSettingsMajorArray.forEach(([filterRow, valueRows], majorIndex) => {
      valueRows.forEach(valueRow => {
        sheet.getRange(`${countColumn}:${countColumn}`).clearContent();
        // フィルタ設定がクリアされていることをチェック
        const filterRanges: GoogleAppsScript.Spreadsheet.Range[] = [
          sheet.getRange(`${setupToClosingFilterColumn}${filterRow}`),
          sheet.getRange(`${setupToClosingFilterColumn}${valueRow}`),
          total1Sheet.getRange(`${setupToClosingFilterColumn}${filterRow}`),
          total1Sheet.getRange(`${setupToClosingFilterColumn}${valueRow}`),
          total2Sheet.getRange(`${total2FilterColumn}${filterRow}`),
          total2Sheet.getRange(`${total2FilterColumn}${valueRow}`),
          quoteSheet.getRange(`${quoteFilterColumn}${majorIndex + 12}`),
          total3Sheet.getRange(`${total2FilterColumn}${majorIndex + 5}`),
        ];
        filterRanges.forEach(range => {
          if (filterRow !== projectManagementMajorRow) {
            throwIfNotZero_(range);
          }
        });
        if (filterRow === projectManagementMajorRow) {
          sheet
            .getRange(`${countColumn}${filterSettingsMajorArray[0][1][0]}`)
            .setValue(1);
        } else {
          sheet
            .getRange(`${countColumn}${filterSettingsMajorArray[0][1][0]}`)
            .clearContent();
        }
        sheet.getRange(`${countColumn}${valueRow}`).setValue(1);
        SpreadsheetApp.flush();
        // フィルタ設定が適用されていることをチェック
        filterRanges.forEach((range, idx) => {
          // Setup~Closingシートで大項目がその他の場合、価格が0であればフィルタは非表示
          if (
            range.getRow() === othersMajorFilterRow &&
            idx === 0 &&
            range.offset(0, -3).getValue() === 0
          ) {
            throwIfNotZero_(range);
          } else if (idx === 2 && range.offset(0, -3).getValue() === 0) {
            // Totalシートの場合、価格が0であればフィルタ非表示
            throwIfNotZero_(range);
          } else if (idx === 3 && range.offset(0, -4).getValue() === 0) {
            // Totalシートの場合、価格が0であればフィルタ非表示
            throwIfNotZero_(range);
          } else if (idx === 4) {
            // Total2シートの場合、価格が空白であればフィルタ非表示
            const minorRowArray = filterSettingsMajorArray.find(
              setting => setting[0] === filterRow
            )?.[1];
            let filterValue = 0;
            for (let i = 0; i < minorRowArray!.length; i++) {
              const minorRow = minorRowArray![i];
              const cellValue = total2Sheet
                .getRange(`${total2SheetSumColumn}${minorRow}`)
                .getValue();
              filterValue += cellValue === '' ? 0 : cellValue;
            }
            if (filterValue === 0) {
              throwIfNotZero_(range);
            } else {
              throwIfZero_(range);
            }
          } else if (idx === 5 && range.offset(0, -2).getValue() === '') {
            // Total2シートの場合、価格が空白であればフィルタ非表示
            throwIfNotZero_(range);
          } else if (
            (idx === 6 || idx === 7) &&
            range.offset(0, -2).getValue() === 0
          ) {
            // Quote, Total3シートの場合、価格が0であればフィルタ非表示
            throwIfNotZero_(range);
          } else {
            throwIfZero_(range);
          }
        });
      });
    });
  });
  console.log(
    'Quote, Total～Total3, Setup～Closingシートのフィルタ設定チェックが完了しました。'
  );
}
function throwIfZero_(range: GoogleAppsScript.Spreadsheet.Range): void {
  if (range.getValue() === 0) {
    throw new Error(
      `Filter setting is not applied correctly in ${range.getSheet().getName()} at row ${range.getRow()}.`
    );
  }
}

function throwIfNotZero_(range: GoogleAppsScript.Spreadsheet.Range): void {
  if (range.getValue() !== 0) {
    throw new Error(
      `Filter setting should be cleared in ${range.getSheet().getName()} at row ${range.getRow()}.`
    );
  }
}
