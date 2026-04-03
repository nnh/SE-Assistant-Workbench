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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { hello } from './example-module';
import { moveToFolder_ } from './folderUtils';
import { moveFileToFolder_ } from './fileUtils';
import { createFoldersForSheet_ } from './workflow';
import { getExcludePaths_ } from './settings';
import * as consts from './const';

function moveFilesToFolder() {
  const inputFileSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    consts.SHEET_NAME_FILE_LIST
  );
  if (inputFileSheet) {
    moveFileToFolder_(inputFileSheet);
  } else {
    console.error(`シート「${consts.SHEET_NAME_FILE_LIST}」が見つかりません。`);
  }
}

function moveToFolder() {
  const inputFolderSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    consts.SHEET_NAME_FOLDER_LIST
  );
  if (inputFolderSheet) {
    moveToFolder_(inputFolderSheet);
  } else {
    console.error(
      `シート「${consts.SHEET_NAME_FOLDER_LIST}」が見つかりません。`
    );
  }
}
function runFolderGenerationForMoveFolders() {
  const excludePaths = getExcludePaths_();
  createFoldersForSheet_(consts.SHEET_NAME_FOLDER_LIST, excludePaths);
}
function runFolderGenerationForMoveSheets() {
  const excludePaths = getExcludePaths_();
  createFoldersForSheet_(consts.SHEET_NAME_FILE_LIST, excludePaths);
}

console.log(hello());
