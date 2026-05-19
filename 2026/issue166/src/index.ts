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
import { runNextArchiving_ } from './driveItemsArchiver';
import { runReportGeneration_ } from './driveItemsReportGenerator';
import { runPermissionReportGeneration_ } from './permissionReportGenerator';
import {
  archivePermissionsForTargetIds_,
  fetchPermissionsAndSaveForTargetIds_,
} from './permissionArchiver';
import {
  archiveSharedDrivePoliciesDriveGet_,
  archiveSharedDrivePoliciesPermissions_,
  sharedDrivePolicyReportGenerator_,
} from './sharedDrivePolicyReportGenerator';
import { runDrivePermissionMatrixReportGeneration_ } from './driveDataMerger';
import {
  runInternalDriveExcludeCheck_,
  runExternalAccountPermissionReport_,
} from './InternalDriveProcessor';
import { setupProjectProperties_ } from './Initializer';

function runDrivePermissionMatrixReportGeneration() {
  runDrivePermissionMatrixReportGeneration_();
}

/**
 * 共有ドライブ自体の設定を保存・レポート出力する一連の処理
 */
function runSharedDrivePolicyReportGeneration() {
  // 設定を取得
  archiveSharedDrivePoliciesDriveGet_();
  archiveSharedDrivePoliciesPermissions_();
  // スプレッドシートに出力
  sharedDrivePolicyReportGenerator_();
}

/**
 * パーミッション情報取得
 */
// 権限一覧の出力
function runPermissionReportGeneration() {
  runPermissionReportGeneration_();
}
// 取得対象のIDをもとにパーミッション情報を取得し、JSONファイルとして保存する
function fetchPermissionsAndSaveForTargetIds() {
  fetchPermissionsAndSaveForTargetIds_();
}
// 取得対象になるファイルのIDをスプレッドシートに出力する
function archivePermissionsForTargetIds() {
  archivePermissionsForTargetIds_();
}

/**
 * 1. 共有ドライブのアイテムを保存したJSONをもとに、フォルダ構成レポートをスプレッドシートへ出力する処理
 */

// aro.staff以外の権限情報を抽出する処理
function externalAccountPermissionReport() {
  runExternalAccountPermissionReport_();
}

// 内部のみ共有ドライブの権限取得対象外フォルダを洗い出す処理
function internalDriveExcludeCheck() {
  runInternalDriveExcludeCheck_();
}

/**
 * 1.3. 共有ドライブのアイテムを保存したJSONをもとに、フォルダ構成レポートをスプレッドシートへ出力する処理
 */
function runReportGeneration() {
  runReportGeneration_();
}

/**
 * 1.2. 主処理
 * キューから未処理の共有ドライブを取り出し、アイテムと権限情報をJSONとして保存します。
 */
function executeJsonArchivingProcess() {
  runNextArchiving_();
}
/**
 * 初期処理
 */
function setupProjectProperties() {
  setupProjectProperties_();
}
