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
  setupToClosingSheetNames,
  quotationRequestSheetName,
} from './commonForTest';
export function getSpreadsheet_(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const spreadsheetId: string = copyTemplateSpreadsheetAndSaveId_();
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet | null =
    getSpreadsheetById_(spreadsheetId);
  if (!spreadsheet) {
    throw new Error('Spreadsheet not found after copying.');
  }
  return spreadsheet;
}
export function execCopyTemplateSpreadsheetAndSaveId_(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    getSpreadsheet_();
  const trialSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    spreadsheet,
    'Trial'
  );
  trialSheet.getRange('B2').clearContent();
  trialSheet.getRange('B4').clearContent();
  trialSheet.getRange('B6:B10').clearContent();
  trialSheet.getRange('B18:B26').clearContent();
  trialSheet.getRange('D32:E40').clearContent();
  trialSheet.getRange('B44').setValue('1.0');
  trialSheet.getRange('B45').setValue('0.1');
  trialSheet.getRange('B46').clearContent();
  setupToClosingSheetNames.forEach(sheetName => {
    const sheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
      spreadsheet,
      sheetName
    );
    sheet.getRange('F:F').clearContent();
  });
  const quotationRequestSheet: GoogleAppsScript.Spreadsheet.Sheet =
    getSheetBySheetName_(spreadsheet, quotationRequestSheetName);
  quotationRequestSheet
    .getRange(2, 1, 1, quotationRequestSheet.getLastColumn())
    .clearContent();
  return spreadsheet;
}
