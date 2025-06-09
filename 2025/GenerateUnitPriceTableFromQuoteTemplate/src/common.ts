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
export const coefficientSheetNameMap: Map<string, string> = new Map([
  ['coefficient10', '係数1'],
  ['coefficient15', '係数1.5'],
]);

export function getSpreadsheetByProperty_(
  propertyName: string
): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const spreadsheetId: string | null =
    PropertiesService.getScriptProperties().getProperty(propertyName);
  if (!spreadsheetId) {
    throw new Error(`${propertyName} is not set in script properties.`);
  }
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(spreadsheetId);
  if (!spreadsheet) {
    throw new Error(`Spreadsheet with ID ${spreadsheetId} not found.`);
  }
  return spreadsheet;
}
