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
import { outputDrives_, outputPermissions_ } from './getInfo';
import { createTable_ } from './summary';
function createSummaryMain() {
  // DrivesInfoシートとPermissionsInfoシートを結合してlistシートに出力します
  createTable_();
}
function permissionOutputMain() {
  // PermissionsInfoシートに共有ドライブの権限情報を出力します
  outputPermissions_();
}
function driveOutputMain() {
  // DrivesInfoシートに共有ドライブの情報を出力します
  outputDrives_();
}
console.log('');
