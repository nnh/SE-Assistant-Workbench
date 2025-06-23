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
import { checkFilterSettings_ } from './checkFilterSetting';
import { checkItemsSheet_ } from './checkItemsSheet';
import { validateItemsAndSummaryMatch_ } from './checkSetupToClosingSheet';
import {
  checkItemsAndPrice_,
  checkItemsAndPriceLogic_,
} from './checkItemsAndPrice';
import { setupToClosingSheetNames } from './commonForTest';
function checkItemsSheet(): void {
  checkItemsSheet_();
}
function validateItemsAndSummaryMatch(): void {
  const test = validateItemsAndSummaryMatch_();
}
function checkItemsAndPrice(): void {
  checkItemsAndPrice_();
  checkItemsAndPriceLogic_();
}
function checkFilterSettings1(): void {
  const target = setupToClosingSheetNames.slice(0, 3);
  target.forEach(sheetName => {
    checkFilterSettings_(sheetName);
  });
}
function checkFilterSettings2(): void {
  const target = setupToClosingSheetNames.slice(3, 6);
  target.forEach(sheetName => {
    checkFilterSettings_(sheetName);
  });
}
function checkFilterSettings3(): void {
  const target = setupToClosingSheetNames.slice(6);
  target.forEach(sheetName => {
    checkFilterSettings_(sheetName);
  });
}
