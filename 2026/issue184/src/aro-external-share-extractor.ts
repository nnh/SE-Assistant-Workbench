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
  ARO_FILTER_COLUMN_INDEX,
  ARO_FILTER_VALUE,
  ARO_SHEET_NAME,
} from './constants';

export interface AroExternalShareResult {
  header: unknown[];
  rows: unknown[][];
}

/**
 * 指定スプレッドシートの「ARO外部共有ファイル一覧」シートから、
 * E列に「リンクを知っている全員」を含む行を抽出する。
 */
export function extractAroExternalShareRows_(
  spreadsheetId: string,
): AroExternalShareResult {
  const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
  const sheet = spreadsheet.getSheetByName(ARO_SHEET_NAME);
  if (!sheet) {
    throw new Error(`シート「${ARO_SHEET_NAME}」が見つかりません。`);
  }

  const [header, ...dataRows] = sheet.getDataRange().getValues();
  const rows = dataRows.filter(row =>
    String(row[ARO_FILTER_COLUMN_INDEX]).includes(ARO_FILTER_VALUE),
  );

  return {header, rows};
}
