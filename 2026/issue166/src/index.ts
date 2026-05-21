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
import { runNextArchiving_ } from './core/item/driveItemsArchiver';
import { runReportGeneration_ } from './core/item/driveItemsReportGenerator';
import { runPermissionReportGeneration_ } from './core/permission/permissionReportGenerator';
import {
  archivePermissionsForTargetIds_,
  fetchPermissionsAndSaveForTargetIds_,
} from './core/permission/permissionArchiver';
import {
  archiveSharedDrivePoliciesDriveGet_,
  archiveSharedDrivePoliciesPermissions_,
  sharedDrivePolicyReportGenerator_,
} from './core/policy/sharedDrivePolicyReportGenerator';
import { runDrivePermissionMatrixReportGeneration_ } from './core/permission/driveDataMerger';
import {
  runInternalDriveExcludeCheck_,
  runExternalAccountPermissionReport_,
} from './core/permission/InternalDriveProcessor';
import { setupProjectProperties_ } from './core/app/Initializer';

/**
 * 5.1.
 * 共有ドライブのアイテムと権限情報をもとに、アクセス権マトリクスレポートを生成する処理
 */
function runDrivePermissionMatrixReportGeneration() {
  runDrivePermissionMatrixReportGeneration_();
}

/**
 * 4.1.
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
 * 3.1. aro.staff以外の権限情報を抽出する処理
 */
function externalAccountPermissionReport() {
  runExternalAccountPermissionReport_();
}

/**
 * 2.4.
 * 権限一覧の出力
 */
function runPermissionReportGeneration() {
  runPermissionReportGeneration_();
}
/**
 * 2.3.
 * 取得対象のIDをもとにパーミッション情報を取得し、JSONファイルとして保存する
 */
function fetchPermissionsAndSaveForTargetIds() {
  fetchPermissionsAndSaveForTargetIds_();
}

/**
 * 2.2.
 * 取得対象になるファイルのIDをスプレッドシートに出力する処理
 */
function archivePermissionsForTargetIds() {
  archivePermissionsForTargetIds_();
}

/**
 * 2.1.
 * 任意の処理
 * パーミッション取得対象外とする親フォルダを目検で洗い出し、シートに設定します。
 * 設定した情報を元に取得対象外ファイルの設定を行います。
 */
function internalDriveExcludeCheck() {
  runInternalDriveExcludeCheck_();
}

/**
 * 1.3. 出力処理
 * 共有ドライブのアイテムを保存したJSONをもとに、フォルダ構成レポートをスプレッドシートへ出力します。
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
 * 1.1. 初期処理
 * スクリプトプロパティの雛形をセットします。
 */
function setupProjectProperties() {
  setupProjectProperties_();
}
