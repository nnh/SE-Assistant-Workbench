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
function getScriptProperty_(key: string): string {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(`Script property ${key} is not set.`);
  }
  return value;
}
function getSheetByName_(spreadsheetId: string, sheetName: string) {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  if (!spreadsheet) {
    throw new Error(`Spreadsheet with ID ${spreadsheetId} not found.`);
  }
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(
      `Sheet ${sheetName} not found in spreadsheet ${spreadsheetId}.`
    );
  }
  return sheet;
}

// 調査対象のレコードを抽出してスプレッドシートに書き出す処理
export function extractWOSRecordsToSheet_() {
  const inputSpreadsheetId = getScriptProperty_('inputSpreadSheetId');
  const inputSheet = getSheetByName_(inputSpreadsheetId, 'Sheet1');
  const inputValues = inputSheet.getRange('A5:AI3635').getValues();
  const facilitySpreadsheetId = getScriptProperty_('facilitySpreadSheetId');
  const facilitySheet = getSheetByName_(facilitySpreadsheetId, 'Base');
  const facilityValues = facilitySheet
    .getDataRange()
    .getValues()
    .map(row => [row[7], row[0]]);
  const facilityMap = new Map<string, string>();
  for (const [name, code] of facilityValues) {
    facilityMap.set(name as string, code as string);
  }
  facilityMap.set('函館医療センター', '102');
  facilityMap.set('静岡てんかん・神経医療センター', '307');
  const filteredInputValues = inputValues
    .filter(row => row[33] !== '') // AH列は33番目（0始まり）
    .map(row => [facilityMap.get(row[0]), row[0], row[1], row[2]]); // A, B, C列だけを残す
  const undefinedFacilityRows = filteredInputValues.filter(
    row => row[0] === undefined
  );
  if (undefinedFacilityRows.length > 0) {
    console.warn('Undefined facility names found:');
    undefinedFacilityRows.forEach(row => {
      console.warn(`Facility Name: ${row[1]}, Row Data: ${row}`);
    });
  }
  const undefinedWosIdRecords = filteredInputValues.filter(
    row => !/^WOS:(\d{15})$/i.test(row[3])
  );
  if (undefinedWosIdRecords.length > 0) {
    console.warn('Undefined WOS IDs found:');
    undefinedWosIdRecords.forEach(row => {
      console.warn(`WOS ID: ${row[3]}, Row Data: ${row}`);
    });
  }
  const targetWosIdRecords = filteredInputValues.filter(row =>
    /^WOS:(\d{15})$/i.test(row[3])
  );
  if (targetWosIdRecords.length === 0) {
    console.warn('No valid WOS IDs found.');
  }
  const outputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '調査対象'
  );
  outputSheet.clearContents();
  const header = [['施設コード', '施設名', 'PubMed ID', 'WOS ID']];
  outputSheet.getRange(1, 1, 1, header[0].length).setValues(header);
  outputSheet
    .getRange(2, 1, targetWosIdRecords.length, targetWosIdRecords[0].length)
    .setValues(targetWosIdRecords);
  return;
}
// 調査対象シートから情報を取得し、JSONファイルに存在するか確認する処理
export function test_() {
  const targetWosIdRecordsSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '調査対象'
  );
  const targetValues = targetWosIdRecordsSheet
    .getDataRange()
    .getValues()
    .filter((_, idx) => idx > 0);
  const inputJsonFolderId = getScriptProperty_('targetJsonFolderId');
  const folder = DriveApp.getFolderById(inputJsonFolderId);
  const files = folder.getFiles();
  /*  while (files.hasNext()) {
    const file = files.next();
    Logger.log(`Found file: ${file.getName()}`);
  }*/
}
