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
import {PATH_LOOKUP_OUTPUT_SHEET_NAME} from './constants';
import {getOrCreateSheet_} from './sheet-utils';

/**
 * パス付き差分抽出結果シートをクリアしたうえで、見出し行と結果をまとめて書き込む。
 */
export function writePathLookupResult_(
  header: string[],
  rows: unknown[][],
): void {
  const sheet = getOrCreateSheet_(
    SpreadsheetApp.getActiveSpreadsheet(),
    PATH_LOOKUP_OUTPUT_SHEET_NAME,
  );
  sheet.clearContents();

  const values = [header, ...rows];
  sheet.getRange(1, 1, values.length, header.length).setValues(values);
}
