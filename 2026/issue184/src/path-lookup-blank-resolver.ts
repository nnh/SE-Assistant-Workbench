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
  PATH_LOOKUP_ID_COLUMN_INDEX,
  PATH_LOOKUP_OUTPUT_SHEET_NAME,
  PATH_LOOKUP_PATH_COLUMN_INDEX,
} from './constants';
import {getFilePath_} from './file-path-resolver';

/**
 * 「パス付き差分抽出結果」シートでパスが空白の行について、
 * IDをもとにDriveAppでパスを取得し、1件ずつシートに書き込む。
 * 件数が多く時間がかかるため、途中経過が残るように1件ごとに書き込む。
 */
export function fillBlankPaths_(): void {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    PATH_LOOKUP_OUTPUT_SHEET_NAME,
  );
  if (!sheet) {
    throw new Error(
      `シート「${PATH_LOOKUP_OUTPUT_SHEET_NAME}」が見つかりません。`,
    );
  }

  const values = sheet.getDataRange().getValues();

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    if (row[PATH_LOOKUP_PATH_COLUMN_INDEX]) {
      continue;
    }
    const path = getFilePath_(row[PATH_LOOKUP_ID_COLUMN_INDEX]);
    sheet
      .getRange(rowIndex + 1, PATH_LOOKUP_PATH_COLUMN_INDEX + 1)
      .setValue(path);
  }
}
