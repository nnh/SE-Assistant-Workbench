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
import {
  SHARE_FILTER_COLUMN_INDEX,
  SHARE_FILTER_EXCLUDE_VALUE,
  SHARE_SHEET_NAME,
} from './constants';

export interface ShareExtractResult {
  header: unknown[] | null;
  rows: unknown[][];
}

/**
 * 指定スプレッドシートの「共有権限」シートから、F列がPRIVATEでない行を抽出する。
 * 「共有権限」シートが存在しない場合はスキップし、空の結果を返す。
 */
export function extractShareRows_(spreadsheetId: string): ShareExtractResult {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(SHARE_SHEET_NAME);
  if (!sheet) {
    return {header: null, rows: []};
  }

  const [header, ...dataRows] = sheet.getDataRange().getValues();
  const rows = dataRows.filter(
    row => row[SHARE_FILTER_COLUMN_INDEX] !== SHARE_FILTER_EXCLUDE_VALUE,
  );

  return {header: header ?? null, rows};
}
