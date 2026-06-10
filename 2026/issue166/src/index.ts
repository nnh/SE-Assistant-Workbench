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
// 【作業用】削除する場合: 下記 import と workExtractMissingPermissionIds 関数を合わせて削除してください
import { workExtractMissingPermissionIds_ } from './core/permission/workExtractMissingPermissionIds';
import { executeJsonArchivingProcess_ } from './core/item/driveItemsArchiver';
import { runReportGeneration_ } from './core/item/driveItemsReportGenerator';
import {
  runPermissionReportGenerationFromSpecifiedIds_,
  runPermissionReportGenerationFromSpecifiedIdsBatch_,
} from './core/permission/permissionReportGenerator';
import {
  archivePermissionsForTargetIds_,
  fetchPermissionsAndSaveForTargetIds_,
} from './core/permission/permissionArchiver';
import { runDrivePermissionMatrixReportGeneration_ } from './core/permission/driveDataMerger';
import { runExternalAccountPermissionReport_ } from './core/permission/externalAccountPermissionReport';
import { setupProjectProperties_ } from './core/app/Initializer';
import { runInternalDriveExcludeCheck_ } from './core/permission/internalDriveExcludeChecker';

/**
 * 【作業用】権限一覧に存在しないIDをARO外部共有_フォルダ構成から抽出し、作業用_権限出力対象IDリストに出力します。
 * 削除する場合: この関数・上部の import・workExtractMissingPermissionIds.ts ファイルを削除してください。
 */
function workExtractMissingPermissionIds() {
  workExtractMissingPermissionIds_();
}

/**
 * 5.1.
 * 共有ドライブのアイテムと権限情報をもとに、アクセス権マトリクスレポートを生成する処理
 */
function runDrivePermissionMatrixReportGeneration() {
  runDrivePermissionMatrixReportGeneration_();
}

/**
 * 3.1. aro.staff以外の権限情報を抽出する処理
 */
function externalAccountPermissionReport() {
  runExternalAccountPermissionReport_();
}

/**
 * 2.4.
 * 指定IDの権限情報を権限一覧へ出力
 * 「作業用_権限出力対象IDリスト」シートのA1セルから縦にファイルIDを記載して実行してください。
 */
//function runPermissionReportGenerationFromSpecifiedIds() {
//  runPermissionReportGenerationFromSpecifiedIds_();
//}

/**
 * 2.4b.
 * 指定IDの権限情報をバッチ処理で権限一覧へ出力
 * IDが多くタイムアウトが発生する場合はこちらを使用してください。
 * 200件ずつ処理し、残りがある場合は自動でトリガーを登録して続きを実行します。
 */
function runPermissionReportGenerationFromSpecifiedIdsBatch() {
  runPermissionReportGenerationFromSpecifiedIdsBatch_();
}
/**
 * 2.3.
 * 「作業用_パーミッション未取得IDリスト」シートのA列のIDをもとに、対象アイテムのパーミッション情報を取得してJSONファイルとして保存します。
 * 取得したパーミッション情報は、ファイルIDをファイル名に含めて保存します。
 * 例えば、ファイルIDが「abc123」の場合、「permissions_abc123.json」のようなファイル名で保存されます。
 * 保存先のフォルダはスクリプトプロパティで指定されたフォルダになります。
 */
function fetchPermissionsAndSaveForTargetIds() {
  fetchPermissionsAndSaveForTargetIds_();
}

/**
 * 2.2.
 * 「${ドライブ名}_フォルダ構成」シートの情報を元に、パーミッション取得対象アイテムのIDを抽出し
 * 「作業用_パーミッション未取得IDリスト」シートに出力します。
 * 該当するIDのJSONファイルが存在しない場合、そのIDはパーミッション取得対象とみなし、出力する仕様です。
 * 該当するIDのJSONファイルが存在する場合、更新日時を確認し、前回取得以降にアイテムが更新されている場合は
 * パーミッション取得対象とみなして出力します。更新されていない場合は対象外とみなして出力しません。
 * 上記の条件にかかわらず、G列に何らかの文字列が記載されたアイテムはパーミッション取得対象外とします。
 */
function archivePermissionsForTargetIds() {
  archivePermissionsForTargetIds_();
}

/**
 * 2.0. 任意の処理
 * 「権限取得対象外親フォルダパス」シートのA列に記載されたフォルダパスをもとに、
 * 共有ドライブ内のアイテムをフィルタリングして、対象外のアイテムを抽出します。
 * パスは前方一致で判定します。例えば「ルートフォルダ/フォルダA」と記載した場合、
 * 「ルートフォルダ/フォルダA/サブフォルダ1/ファイルX」は対象外になりますが、
 * 「ルートフォルダ/ルートフォルダ/フォルダA」は対象外になりません。
 * 対象外と判定されたアイテムについては、「${ドライブ名}_フォルダ構成」シートのG列に「取得対象外」と記載します。
 * **** この処理を実行する場合は、下記の事前処理が必要です。****
 * 1.「権限取得対象外親フォルダパス」シートを作成する。
 * 2. パーミッション取得対象外とする親フォルダのパスをA列に入力する。一行目からデータを読み込む仕様のため、1行目から入力してください。
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
  // テスト用フラグ
  // trueにすると最初の1ページ（最大1000件）のみ保存して終了します
  const limitToFirstPage = false;
  if (limitToFirstPage) {
    console.warn(
      'limitToFirstPageフラグがtrueのため、最初の1ページのみ処理して終了します。' +
        '全件処理する場合はこのフラグをfalseにしてください。'
    );
  }
  executeJsonArchivingProcess_(limitToFirstPage);
}

/**
 * 1.2b. 主処理（フォルダのみ）
 * キューから未処理の共有ドライブを取り出し、フォルダのみをJSONとして保存します。
 */
function executeJsonArchivingProcessFoldersOnly() {
  // テスト用フラグ
  // trueにすると最初の1ページ（最大1000件）のみ保存して終了します
  const limitToFirstPage = false;
  if (limitToFirstPage) {
    console.warn(
      'limitToFirstPageフラグがtrueのため、最初の1ページのみ処理して終了します。' +
        '全件処理する場合はこのフラグをfalseにしてください。'
    );
  }
  executeJsonArchivingProcess_(limitToFirstPage, true);
}
/**
 * 1.1. 初期処理
 * スクリプトプロパティの雛形をセットします。
 */
function setupProjectProperties() {
  setupProjectProperties_();
}
