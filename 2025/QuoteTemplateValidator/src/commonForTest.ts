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
export const trialTypeAndValueMap: Map<string, number> = new Map();
trialTypeAndValueMap.set('観察研究・レジストリ', 1);
trialTypeAndValueMap.set('医師主導治験', 5);
trialTypeAndValueMap.set('介入研究（特定臨床研究以外）', 2);
trialTypeAndValueMap.set('特定臨床研究', 3);
trialTypeAndValueMap.set('先進', 5);
export const spreadSheetIdScriptPropertyKey = 'TEST_SPREADSHEET_ID';
export function getSheetBySheetName_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" does not exist.`);
  }
  return sheet;
}
export function getScriptProperty_(key: string): string {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (value === null) {
    throw new Error(`Property not found for key: ${key}`);
  }
  return value;
}
export function getSpreadsheetById_(
  spreadsheetId: string
): GoogleAppsScript.Spreadsheet.Spreadsheet | null {
  try {
    return SpreadsheetApp.openById(spreadsheetId);
  } catch (e) {
    return null;
  }
}
export function copyTemplateSpreadsheetAndSaveId_(): string {
  const existingId = PropertiesService.getScriptProperties().getProperty(
    spreadSheetIdScriptPropertyKey
  );
  if (existingId) {
    console.log(`Using existing spreadsheet ID: ${existingId}`);
    return existingId;
  }
  const templateId = getScriptProperty_('TEMPLATE_SPREADSHEET_ID');
  const templateSpreadsheet = getSpreadsheetById_(templateId);
  if (!templateSpreadsheet) {
    throw new Error('Template spreadsheet not found.');
  }
  const copiedFile = DriveApp.getFileById(templateId).makeCopy(
    `Copy of ${templateSpreadsheet.getName()}`,
    DriveApp.getRootFolder()
  );
  const now = new Date();
  const formattedDate = Utilities.formatDate(
    now,
    Session.getScriptTimeZone(),
    'yyyyMMdd_HHmmss'
  );
  copiedFile.setName(
    `${formattedDate}_Copy of ${templateSpreadsheet.getName()}`
  );
  const newFileId = copiedFile.getId();
  PropertiesService.getScriptProperties().setProperty(
    spreadSheetIdScriptPropertyKey,
    newFileId
  );
  return newFileId;
}
export function getTrialsAndItemsSheets_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): [
  trialsSheet: GoogleAppsScript.Spreadsheet.Sheet,
  itemsSheet: GoogleAppsScript.Spreadsheet.Sheet,
] {
  const trialsSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    spreadsheet,
    'Trial'
  );
  const itemsSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    spreadsheet,
    'Items'
  );
  return [trialsSheet, itemsSheet];
}
