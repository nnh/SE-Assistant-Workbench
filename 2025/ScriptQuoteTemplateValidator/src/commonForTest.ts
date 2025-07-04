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
export const testPatternKeys: Map<number, string> = new Map([
  [0, '観察研究・なし'],
  [1, '観察研究・あり'],
  [2, '介入研究・あり'],
  [3, '特定臨床研究・なし'],
  [4, '特定臨床研究・あり'],
  [5, '医師主導治験・なし'],
  [6, '医師主導治験・あり・最終解析図表数49'],
  [7, '医師主導治験・あり・最終解析図表数100'],
  [8, '観察研究・あり・中間解析図表数100'],
]);
export const setupToClosingSheetNames = [
  'Setup',
  'Registration_1',
  'Registration_2',
  'Interim_1',
  'Observation_1',
  'Interim_2',
  'Observation_2',
  'Closing',
];
export const quotationRequestSheetName = 'Quotation Request';
export const trialSheetName = 'Trial';
export const coefficients15 = '営利企業原資（製薬企業等）';
export const observationalStudy = '観察研究・レジストリ';
export const investigatorInitiatedClinicalTrial = '医師主導治験';
export const specificClinicalResearch = '特定臨床研究';
export const interventionalStudy = '介入研究（特定臨床研究以外）';
export const trialTypeName = '試験種別';

export const spreadSheetIdScriptPropertyKey = 'TEST_SPREADSHEET_ID';
export const testPatternIndexPropertyKey = 'TEST_PATTERN_INDEX';
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
export function getIndexFromScriptProperties_(): number {
  const testPatternIndex: string | null =
    PropertiesService.getScriptProperties().getProperty(
      testPatternIndexPropertyKey
    );
  if (testPatternIndex === null) {
    return -1;
  }
  const maxIndex = Math.max(...Array.from(testPatternKeys.keys()));
  const index = Number(testPatternIndex);
  if (index > maxIndex) {
    console.log(
      `Index ${index} exceeds maximum index ${maxIndex}. Resetting to -1.`
    );
    return -1;
  }
  return index;
}
