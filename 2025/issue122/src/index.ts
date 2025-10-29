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
import { cstMoveBeforeDataSheetName } from './common';

function test() {
  const beforeSheetName = '共有ドライブ移動前SINETフォルダ';
  const afterSheetName = cstMoveBeforeDataSheetName;
  testCompareDataBeforeAfterMove_(beforeSheetName, afterSheetName);
}
function testGetDataInformation() {
  const inputSheetName = cstMoveBeforeDataSheetName;
  const outputSheetName = 'ISRテスト用';
  const pathStartText = '情報システム研究室(ISR)/newsletter';
  testGetDataInformation_(inputSheetName, outputSheetName, pathStartText);
}

function main() {
  exportFolderPermissionsRecursive_();
}

console.log('');
