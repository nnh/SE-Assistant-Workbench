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
export function verifyWosIdsInJsonFiles_() {
  const targetWosIdRecordsSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    '調査対象'
  );
  const targetValues = targetWosIdRecordsSheet
    .getDataRange()
    .getValues()
    .filter((_, idx) => idx > 0);
  const facilityWosMap = new Map<string, string[]>();
  for (const row of targetValues) {
    const facilityCode = row[0] as string;
    const wosId = row[3] as string;
    if (!facilityWosMap.has(facilityCode)) {
      facilityWosMap.set(facilityCode, []);
    }
    facilityWosMap.get(facilityCode)!.push(wosId);
  }
  const facilityWosArray: [string, string[]][] = Array.from(
    facilityWosMap.entries()
  );

  const inputJsonFolderId = getScriptProperty_('targetJsonFolderId');
  const files = getFilesInFolder_(inputJsonFolderId);
  const facilityWosStatusArray: [string, [string, string][]][] =
    facilityWosArray.map(([facilityCode, wosIds]) => {
      // Find the file matching the facility code (e.g., "100.json")
      const file = files.find(f => f.getName() === `${facilityCode}.json`);
      let jsonWosIds: string[] = [];
      if (file) {
        try {
          const content = file.getBlob().getDataAsString();
          const jsonData = JSON.parse(content);
          jsonWosIds = jsonData['papers'].map(
            (paper: any) => paper['uid'] as string
          );
        } catch (e) {
          console.error(
            `Error parsing JSON in file ${facilityCode}.json: ${e}`
          );
        }
      }
      const wosIdSet = new Set(jsonWosIds || []);
      const wosStatus: [string, string][] = wosIds.map(wosId => [
        wosId,
        wosIdSet.has(wosId) ? 'あり' : 'なし',
      ]);
      return [facilityCode, wosStatus];
    });
  const flatFacilityWosStatusArray: [string, string, string][] = [];
  facilityWosStatusArray.forEach(([facilityCode, wosStatusList]) => {
    wosStatusList.forEach(([wosId, status]) => {
      flatFacilityWosStatusArray.push([facilityCode, wosId, status]);
    });
  });
  const outputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'jsonファイル存在確認'
  );
  outputSheet.clearContents();
  const header = [['施設コード', 'WOS ID', 'JSONファイル内の存在有無']];
  outputSheet.getRange(1, 1, 1, header[0].length).setValues(header);
  if (flatFacilityWosStatusArray.length > 0) {
    outputSheet
      .getRange(2, 1, flatFacilityWosStatusArray.length, header[0].length)
      .setValues(flatFacilityWosStatusArray);
  } else {
    console.warn('No data to write to the output sheet.');
  }
}
function getFilesInFolder_(folderId: string): GoogleAppsScript.Drive.File[] {
  const folder = DriveApp.getFolderById(folderId);
  const files: GoogleAppsScript.Drive.File[] = [];
  const fileIterator = folder.getFiles();
  while (fileIterator.hasNext()) {
    files.push(fileIterator.next());
  }
  return files;
}
// クエリ文字列を作成する
export function createQueryString_(): void {
  const inputSheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet().getId(),
    'jsonファイル存在確認'
  );
  const inputValues = inputSheet.getDataRange().getValues();
  const wosIds: string = inputValues
    .filter((row, idx) => idx > 0 && row[2] === 'なし')
    .map(row => {
      const wosid = row[1] as string;
      const res = `UT="${wosid}"`;
      return res;
    })
    .join(' OR ');
  const fileName = 'wos_query.txt';
  const folder = DriveApp.getRootFolder(); // マイドライブ
  const file = folder.createFile(fileName, wosIds, MimeType.PLAIN_TEXT);
  console.log(`File created: ${file.getUrl()}`);
}
