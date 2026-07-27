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
  ARO_ID_COLUMN_INDEX,
  ARO_PATH_COLUMN_INDEX,
  ARO_SHEET_NAME,
  DIFF_OUTPUT_SHEET_NAME,
  DIFF_RESULT_FILE_NAME_COLUMN_INDEX,
  DIFF_RESULT_URL_COLUMN_INDEX,
  DIFF_SOURCE_COLUMN_INDEX,
  PATH_LOOKUP_HEADER,
} from './constants';

export interface PathLookupResult {
  header: string[];
  rows: unknown[][];
}

/**
 * 「差分抽出結果」シートの各行のID(D列)を「ARO外部共有ファイル一覧」シートのID(B列)と
 * 照合し、一致した場合はパス(A列)を、一致しない場合は空文字を付与する。
 */
export function resolvePathsForDiffResult_(
  aroSpreadsheetId: string,
): PathLookupResult {
  const diffSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    DIFF_OUTPUT_SHEET_NAME,
  );
  if (!diffSheet) {
    throw new Error(`シート「${DIFF_OUTPUT_SHEET_NAME}」が見つかりません。`);
  }

  const aroSheet =
    SpreadsheetApp.openById(aroSpreadsheetId).getSheetByName(ARO_SHEET_NAME);
  if (!aroSheet) {
    throw new Error(`シート「${ARO_SHEET_NAME}」が見つかりません。`);
  }

  const pathById = new Map<unknown, unknown>();
  for (const row of aroSheet.getDataRange().getValues().slice(1)) {
    pathById.set(row[ARO_ID_COLUMN_INDEX], row[ARO_PATH_COLUMN_INDEX]);
  }

  const diffRows = diffSheet.getDataRange().getValues().slice(1);
  const rows = diffRows.map(row => {
    const id = row[DIFF_SOURCE_COLUMN_INDEX];
    return [
      pathById.get(id) ?? '',
      id,
      row[DIFF_RESULT_FILE_NAME_COLUMN_INDEX],
      row[DIFF_RESULT_URL_COLUMN_INDEX],
    ];
  });

  return {header: PATH_LOOKUP_HEADER, rows};
}
