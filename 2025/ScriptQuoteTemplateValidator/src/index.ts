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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { setQuotationRequestSheetValues_ } from './setTestData';
import { getSpreadsheet_ } from './copyTemplateSpreadsheetAndSaveId';
import { checkTestMain_ } from './checkBaseTest';
import { getIndexFromScriptProperties_ } from './commonForTest';
import { createTestPattern_ } from './createTestPattern';

function checkTest() {
  const index = getIndexFromScriptProperties_();
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    getSpreadsheet_();
  console.log(`Checking test pattern for index: ${index}`);
  checkTestMain_(spreadsheet, index);
}
function setTest() {
  const index = getIndexFromScriptProperties_() + 1;
  console.log(`Setting test pattern for index: ${index}`);
  const test: Map<string, string> | undefined = createTestPattern_(index);
  if (!test) {
    throw new Error(`Test pattern for index ${index} not found`);
  }
  setQuotationRequestSheetValues_(test, index);
}
