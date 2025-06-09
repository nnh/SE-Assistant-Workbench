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
import { getSpreadsheetByProperty_ } from './common';
import { generateUnitPriceTableFromQuoteTemplate_ } from './generateUnitPriceTableFromQuoteTemplate';
import { execCheckValues_ } from './execCheckValues';
function main() {
  const inputSpreadSheet2015 = getSpreadsheetByProperty_(
    'INPUT_SPREADSHEET_2015'
  );
  const outputSpreadSheet2015 = getSpreadsheetByProperty_(
    'OUTPUT_SPREADSHEET_2015'
  );
  const test = generateUnitPriceTableFromQuoteTemplate_(
    inputSpreadSheet2015,
    outputSpreadSheet2015
  );
  console.log(test);
}
function execCheckValues() {
  const year = '2015'; // or '2025'
  const result = execCheckValues_(year);
  console.log(`Check values for ${year}: ${result}`);
}
