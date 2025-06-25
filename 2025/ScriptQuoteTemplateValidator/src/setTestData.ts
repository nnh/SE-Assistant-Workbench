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
import { execCopyTemplateSpreadsheetAndSaveId_ } from './copyTemplateSpreadsheetAndSaveId';
import {
  getSheetBySheetName_,
  quotationRequestSheetName,
  testPatternIndexPropertyKey,
} from './commonForTest';

// 医師主導治験のみの項目
const investigatorInitiatedClinicalTrialItems = [
  ['PMDA相談資料作成支援', ['あり', 'なし']],
  ['症例検討会', ['あり', 'なし']],
  ['治験薬管理', ['あり', 'なし']],
  ['治験薬運搬', ['あり', 'なし']],
];

export function setQuotationRequestSheetValues_(
  targetTest: Map<string, string>,
  index: number
) {
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    execCopyTemplateSpreadsheetAndSaveId_();
  const quotationRequestSheet: GoogleAppsScript.Spreadsheet.Sheet =
    getSheetBySheetName_(spreadsheet, quotationRequestSheetName);

  for (let col = 0; col < quotationRequestSheet.getLastColumn(); col++) {
    const header: string = quotationRequestSheet
      .getRange(1, col + 1)
      .getValue()
      .toString();
    if (targetTest.has(header)) {
      const value: string = targetTest.get(header) || '';
      quotationRequestSheet.getRange(2, col + 1).setValue(value);
    }
  }
  PropertiesService.getScriptProperties().setProperty(
    testPatternIndexPropertyKey,
    index.toString()
  );
}
export function getTargetTestPattern_(
  testPatternMap: Map<string, Map<string, string>>,
  keyString = ''
): Map<string, string> {
  const keys: string[] = Array.from(testPatternMap.keys());
  if (keyString && !keys.includes(keyString)) {
    throw new Error(`Key "${keyString}" not found in testPatternMap.`);
  }
  const targetTest: Map<string, string> = testPatternMap.get(keyString)!;
  return targetTest;
}
