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
export function getThisFileInformation_() {
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet | null =
    getScriptBindingType_();
  if (ss === null) {
    throw new Error('This script is not bound to a Spreadsheet.');
  }
  const fileUrl = ss.getUrl();
  const filename = ss.getName();
  return { fileUrl, filename };
}
/**
 * 現在のスクリプトがスプレッドシートにバインドされているかを判定する
 *
 */
function getScriptBindingType_(): GoogleAppsScript.Spreadsheet.Spreadsheet | null {
  try {
    // スプレッドシートにバインドされている場合は取得に成功する
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (ss) {
      return ss;
    }
  } catch (e) {
    // 例外が出る場合はスプレッドシートにバインドされていない
  }
  return null;
}
