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
  UnitPriceTableGenerator2015,
  UnitPriceTableGenerator2025,
  UnitPriceTableGenerator2025_AfterMonitoringUnitPriceFix,
} from './generateTables';
import {
  checkTemplateFormulas2015,
  checkTemplateFormulas2025,
  checkTemplateFormulas2025_AfterMonitoringUnitPriceFix,
} from './execCheckTemplateFormulas';
import { compareBeforeAfter_ } from './compareBeforeAfter';
// モニタリング単価修正前後の比較
function execCompareBeforeAfterMonitoringUnitPriceFix(): void {
  compareBeforeAfter_(
    'OUTPUT_SPREADSHEET_2025_BEFORE',
    'OUTPUT_SPREADSHEET_2025_AFTER'
  );
}

// 2025年度版・モニタリング単価修正後
function createSheet2025_AfterMonitoringUnitPriceFix(): void {
  const generator =
    new UnitPriceTableGenerator2025_AfterMonitoringUnitPriceFix();
  generator.execCreateSheet();
  generator.execCheckValues('OUTPUT_SPREADSHEET_2025_AFTER');
}
function execCheckTemplateVariables2025_AfterMonitoringUnitPriceFix(): void {
  const generator = new checkTemplateFormulas2025_AfterMonitoringUnitPriceFix();
  generator.execCheckTemplateVariables();
}
// 2025年度版・モニタリング単価修正後
function createSheet2025(): void {
  const generator = new UnitPriceTableGenerator2025();
  generator.execCreateSheet();
  generator.execCheckValues('OUTPUT_SPREADSHEET_2025_BEFORE');
}
function execCheckTemplateVariables2025_BeforeMonitoringUnitPriceFix(): void {
  const generator = new checkTemplateFormulas2025();
  generator.execCheckTemplateVariables();
}

// 2015年度版
function createSheet2015(): void {
  const generator = new UnitPriceTableGenerator2015();
  generator.execCreateSheet();
  generator.execCheckValues();
}
function execCheckTemplateVariables2015(): void {
  const generator = new checkTemplateFormulas2015();
  generator.execCheckTemplateVariables();
}
