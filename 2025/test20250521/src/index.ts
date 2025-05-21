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
function getNoWoSSheet_(): GoogleAppsScript.Spreadsheet.Sheet {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheetId = scriptProperties.getProperty('SPREADSHEET_ID');
  if (!spreadsheetId) {
    throw new Error('SPREADSHEET_ID is not set in script properties.');
  }
  const sheet = SpreadsheetApp.openById(spreadsheetId).getSheetByName('NoWoS');
  if (!sheet) {
    throw new Error('NoWoS sheet not found.');
  }
  return sheet;
}

function getNoWoSSheetData_(): string[][] {
  const sheet = getNoWoSSheet_();
  const data = sheet.getDataRange().getValues();
  return data;
}
function generatePubMedIdSearchQuery(): void {
  const outputSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('WoS検索クエリ');
  if (!outputSheet) {
    throw new Error('WoS検索クエリ sheet not found.');
  }
  const data = getNoWoSSheetData_();
  const vColumnData = data
    .slice(1)
    .map(row => row[21])
    .filter(value => value !== undefined && value !== '');
  const vColumnSet = new Set(vColumnData);
  const pmidStrings = Array.from(vColumnSet)
    .map(value => `PMID=(${value})`)
    .join(' OR ');
  outputSheet.getRange(2, 1, 1, 1).setValue(pmidStrings);
}
/*
function getSavedrecPmidAndUidMap(): void {
  const pmidAndUidMap = getSavedrecPmidAndUidMap_();
  console.log('PMID and UID map:', pmidAndUidMap);
}
  */
function getSavedrecPmidAndUidMap_(): Map<string, string> {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('savedrecs');
  if (!sheet) {
    throw new Error('savedrec sheet not found.');
  }
  const data = sheet.getDataRange().getValues();
  const map = new Map<string, string>();
  for (let i = 1; i < data.length; i++) {
    const bn = data[i][65]; // BN列 (66番目, 0-indexed)
    const bs = data[i][70]; // BS列 (71番目, 0-indexed)
    if (bn !== undefined && bn !== '' && bs !== undefined && bs !== '') {
      map.set(String(bn), String(bs));
    }
  }
  return map;
}
function outputWoSIds(): void {
  const pmidAndUidMap = getSavedrecPmidAndUidMap_();
  const noWoSData = getNoWoSSheetData_();
  const targetPmidData = noWoSData.slice(1).map(row => row[21]);
  const outputValues = targetPmidData.map(pmid => [
    pmidAndUidMap.get(String(pmid)),
  ]);
  /*  const outputSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('テスト用');
  if (!outputSheet) {
    throw new Error('テスト用 sheet not found.');
  }*/
  const outputSheet = getNoWoSSheet_();
  // Check if W1 cell is "WoS_ID"
  const outputColumn = 23; // W列は23列目
  const headerValue = outputSheet.getRange(1, outputColumn).getValue(); // W列は23列目
  if (headerValue !== 'WoS_ID') {
    throw new Error('W1セルが「WoS_ID」ではありません。');
  }
  // Output values starting from W2
  outputSheet
    .getRange(2, outputColumn, outputValues.length, 1)
    .setValues(outputValues);
}
