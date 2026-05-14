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
import { setupQueue_, runNextArchiving_ } from './driveItemsArchiver';
import { runReportGeneration_ } from './driveItemsReportGenerator';
import { debugFetchPermissions_ } from './permissionArchiver';

function testGetFolderPermissions() {
  debugFetchPermissions_('test_file_id_123');
}
/**
 * 2. 共有ドライブのアイテムを保存したJSONをもとに、フォルダ構成レポートをスプレッドシートへ出力する処理
 */
function runReportGeneration() {
  runReportGeneration_();
}
/**
 * 1. 共有ドライブのアイテムを取得し、JSONファイルとして保存する処理
 */

/**
 * 1.1. 初期処理
 */
function initializeSharedDriveArchivingQueue() {
  setupQueue_();
}
/**
 * 1.2. 主処理
 * キューから未処理の共有ドライブを取り出し、アイテムと権限情報をJSONとして保存します。
 */
function executeJsonArchivingProcess() {
  runNextArchiving_();
}
