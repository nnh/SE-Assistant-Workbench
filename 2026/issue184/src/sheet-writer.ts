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
import {OUTPUT_HEADER, OUTPUT_SHEET_NAME} from './constants';
import {SpreadsheetInfo} from './folder-scanner';
import {getOrCreateSheet_} from './sheet-utils';

/**
 * 出力シートをクリアしたうえで、スプレッドシート一覧をまとめて書き込む。
 */
export function writeSpreadsheetList_(
  spreadsheetInfos: SpreadsheetInfo[],
): void {
  const sheet = getOrCreateSheet_(
    SpreadsheetApp.getActiveSpreadsheet(),
    OUTPUT_SHEET_NAME,
  );
  sheet.clearContents();

  const rows = spreadsheetInfos.map(info => [info.name, info.id, info.url]);
  const values = [OUTPUT_HEADER, ...rows];

  sheet.getRange(1, 1, values.length, OUTPUT_HEADER.length).setValues(values);
}
