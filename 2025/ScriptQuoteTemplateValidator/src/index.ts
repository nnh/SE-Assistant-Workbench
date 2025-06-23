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
import {
  createBaseTestPattern_,
  getTargetTestPattern_,
  setQuotationRequestSheetValues_,
} from './testPattern';
import {
  execCopyTemplateSpreadsheetAndSaveId_,
  getSpreadsheet_,
} from './copyTemplateSpreadsheetAndSaveId';
import { checkTest1_, checkTest2_ } from './checkBaseTest';
import { testPatternKeys } from './commonForTest';
const baseTestPattern: Map<
  string,
  Map<string, string>
> = createBaseTestPattern_();

function checkTest2() {
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    getSpreadsheet_();
  checkTest2_(spreadsheet);
}
function checkTest1() {
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    getSpreadsheet_();
  checkTest1_(spreadsheet);
}
function setTest2() {
  const test2: Map<string, string> = getTargetTestPattern_(
    baseTestPattern,
    testPatternKeys.get(1)
  );
  setQuotationRequestSheetValues_(test2);
}
function setTest1() {
  const test1: Map<string, string> = getTargetTestPattern_(
    baseTestPattern,
    testPatternKeys.get(0)
  );
  setQuotationRequestSheetValues_(test1);
}
