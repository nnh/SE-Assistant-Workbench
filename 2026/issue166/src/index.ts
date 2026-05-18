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
import { runPermissionReportGeneration_ } from './permissionReportGenerator';
import {
  debugFetchPermissions_,
  archivePermissionsForTargetIds_,
  fetchPermissionsAndSaveForTargetIds_,
} from './permissionArchiver';
import {
  archiveSharedDrivePoliciesDriveGet_,
  archiveSharedDrivePoliciesPermissions_,
  sharedDrivePolicyReportGenerator_,
} from './sharedDrivePolicyReportGenerator';
import * as Const from './const';

/**
 * 共有ドライブ自体の設定を取得
 */
// 共有ドライブ自体の設定をスプレッドシートへ出力する処理
function sharedDrivePolicyReportGenerator() {
  sharedDrivePolicyReportGenerator_();
}
// 「共有ドライブのメンバー」を取得
function archiveSharedDrivePoliciesPermissions() {
  archiveSharedDrivePoliciesPermissions_();
}
// 「共有ドライブの設定」を取得
function archiveSharedDrivePoliciesDriveGet() {
  archiveSharedDrivePoliciesDriveGet_();
}
/**
 * パーミッション情報取得
 */
// 権限一覧の出力
function runPermissionReportGeneration() {
  runPermissionReportGeneration_();
}
// 取得対象になるファイルのIDをスプレッドシートに出力する
function archivePermissionsForTargetIds() {
  archivePermissionsForTargetIds_();
}
// 取得対象のIDをもとにパーミッション情報を取得し、JSONファイルとして保存する
function fetchPermissionsAndSaveForTargetIds() {
  fetchPermissionsAndSaveForTargetIds_();
}

function testGetFolderPermissions() {
  debugFetchPermissions_('test_file_id_123');
}
/**
 * 2. 共有ドライブのアイテムを保存したJSONをもとに、フォルダ構成レポートをスプレッドシートへ出力する処理
 */
function runReportGeneration() {
  runReportGeneration_(Const.SHARED_DRIVE_NAME.EXTERNAL);
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
