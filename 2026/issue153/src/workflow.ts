/**
 * Copyright 2025 Google LLC
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
import { getAllDataFromSheet_ } from './spreadsheet';
import { processAndSplitOutput_ } from './transformer';
import { createFolders_ } from './folderUtils';
import * as consts from './const';

export function createFoldersForSheet_(
  targetSheetName: string,
  excludePaths: string[]
): void {
  const values = getAllDataFromSheet_(consts.SHEET_NAME);
  // 加工とシート分割出力
  processAndSplitOutput_(
    values,
    consts.SHEET_NAME_FOLDER_LIST,
    consts.SHEET_NAME_FILE_LIST,
    excludePaths
  );
  const targetSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName);
  if (targetSheet) {
    createFolders_(targetSheet);
  } else {
    console.error(`シート「${targetSheetName}」が見つかりません。`);
  }
}
