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
  ARO_EXTRACT_OUTPUT_SHEET_NAME,
  DIFF_COMPARISON_COLUMN_INDEX,
  DIFF_SOURCE_COLUMN_INDEX,
  DIFF_SOURCE_FILTER_COLUMN_INDEX,
  DIFF_SOURCE_FILTER_VALUE,
  SHARE_EXTRACT_OUTPUT_SHEET_NAME,
} from './constants';

export interface DiffExtractResult {
  header: unknown[];
  rows: unknown[][];
}

/**
 * 「（移動前）共有権限抽出結果」シートのうちF列が「ANYONE_WITH_LINK」の行を対象に、
 * D列が「（移動後）外部共有リンクを知っている全員」シートのB列に存在しない行を抽出する。
 */
export function extractMissingRows_(): DiffExtractResult {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  const sourceSheet = spreadsheet.getSheetByName(
    SHARE_EXTRACT_OUTPUT_SHEET_NAME,
  );
  if (!sourceSheet) {
    throw new Error(
      `シート「${SHARE_EXTRACT_OUTPUT_SHEET_NAME}」が見つかりません。`,
    );
  }
  const comparisonSheet = spreadsheet.getSheetByName(
    ARO_EXTRACT_OUTPUT_SHEET_NAME,
  );
  if (!comparisonSheet) {
    throw new Error(
      `シート「${ARO_EXTRACT_OUTPUT_SHEET_NAME}」が見つかりません。`,
    );
  }

  const [header, ...sourceRows] = sourceSheet.getDataRange().getValues();
  const comparisonValues = comparisonSheet
    .getDataRange()
    .getValues()
    .slice(1)
    .map(row => row[DIFF_COMPARISON_COLUMN_INDEX]);
  const comparisonValueSet = new Set(comparisonValues);

  const filteredRows = sourceRows.filter(
    row =>
      row[DIFF_SOURCE_FILTER_COLUMN_INDEX] === DIFF_SOURCE_FILTER_VALUE &&
      !comparisonValueSet.has(row[DIFF_SOURCE_COLUMN_INDEX]),
  );
  const rows = removeDuplicateRows_(filteredRows);

  return {header, rows};
}

/**
 * 行の内容が完全に一致する重複行を除去する。
 */
function removeDuplicateRows_(rows: unknown[][]): unknown[][] {
  const seen = new Set<string>();
  return rows.filter(row => {
    const key = JSON.stringify(row);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
