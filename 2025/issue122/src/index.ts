/**
 * Copyright 2023 Google LLC
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
import { exportFolderPermissionsRecursive_ } from './example-module';
import {
  testGetDataInformation_,
  testCompareDataBeforeAfterMove_,
} from './forIsrTest';
import { cstMoveBeforeDataSheetName, root, targetFolderId } from './common';
import { setScriptProperties_ } from './config';

function test() {
  const targetPath = getTargetPath_();
  const beforeSheetName = `共有ドライブ移動前${targetPath}フォルダ`;
  execTestGetDataInformation_(root, beforeSheetName);
  const afterSheetName = cstMoveBeforeDataSheetName;
  testCompareDataBeforeAfterMove_(beforeSheetName, afterSheetName);
  SpreadsheetApp.getActiveSpreadsheet().rename(
    `共有ドライブに移動した${targetPath}フォルダの権限確認`
  );
}

function main() {
  execSetProperties_();
  exportFolderPermissionsRecursive_();
}

function execSetProperties_() {
  if (targetFolderId === 'FOLDER_ID_HERE') {
    throw new Error('Please set the actual folder ID in the code.');
  }
  setScriptProperties_(targetFolderId);
}

function execTestGetDataInformation_(root: string, outputSheetName: string) {
  const targetPath = getTargetPath_();
  const inputSheetName = cstMoveBeforeDataSheetName;
  const pathStartText = `${root}/${targetPath}`;
  testGetDataInformation_(inputSheetName, outputSheetName, pathStartText);
}

function getTargetPath_() {
  const targetPath =
    PropertiesService.getScriptProperties().getProperty('TARGET_PATH');
  if (!targetPath) {
    throw new Error('TARGET_PATH is not set in Script Properties.');
  }
  return targetPath;
}
console.log('');
