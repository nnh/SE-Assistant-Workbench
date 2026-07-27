/**
 * Copyright 2026 Google LLC
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
import {TARGET_ID_COLUMN_INDEX, TARGET_SHEET_NAME} from './constants';

/**
 * 「抽出対象シート」のB列からスプレッドシートID一覧を取得する(1行目は見出し)。
 */
export function readTargetSpreadsheetIds_(): string[] {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TARGET_SHEET_NAME);
  if (!sheet) {
    throw new Error(`シート「${TARGET_SHEET_NAME}」が見つかりません。`);
  }

  const values = sheet.getDataRange().getValues();
  return values
    .slice(1)
    .map(row => row[TARGET_ID_COLUMN_INDEX])
    .filter((id): id is string => typeof id === 'string' && id !== '');
}
