/**
 * Copyright 2026 Google LLC
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

import {
  SHARED_DRIVE_ID_KEY,
  OUTPUT_SHEET_NAME,
  CACHE_FILE_ID_KEY,
} from './constants';
import {
  getDriveName_,
  fetchAllFiles_,
  fetchPermissions_,
  buildRows_,
  writeToSheet_,
  loadCache_,
  saveCache_,
  resolvePermissions_,
} from './functions';

// 初期設定：スクリプトプロパティ SHARED_DRIVE_ID が無ければダミー値で作成する。
// 作成後にエディタの設定画面から実際の共有ドライブIDへ書き換える
function setupSharedDriveId(): void {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(SHARED_DRIVE_ID_KEY)) {
    Logger.log('%s は既に設定済みです', SHARED_DRIVE_ID_KEY);
    return;
  }
  properties.setProperty(SHARED_DRIVE_ID_KEY, 'dummy');
  Logger.log('%s をダミー値で作成しました', SHARED_DRIVE_ID_KEY);
}

// メイン：共有ドライブを走査し、パスと権限の一覧をシートに出力する。
// modifiedTime が前回から変わったファイルだけ権限を取り直す（差分取得）
function exportSharedDrivePermissions(): void {
  const driveId =
    PropertiesService.getScriptProperties().getProperty(SHARED_DRIVE_ID_KEY);
  if (!driveId) {
    throw new Error(
      `スクリプトプロパティ ${SHARED_DRIVE_ID_KEY} に共有ドライブIDを設定してください`,
    );
  }
  const driveName = getDriveName_(driveId);
  const files = fetchAllFiles_(driveId);
  const cache = loadCache_();
  const {permissionsByFileId, newCache} = resolvePermissions_(files, cache);
  saveCache_(newCache);
  const rows = buildRows_(files, driveId, driveName, permissionsByFileId);
  writeToSheet_(rows, OUTPUT_SHEET_NAME);
}

// 権限キャッシュの参照を消し、次回実行を全件取得に戻す（取りこぼし時の手動フル再取得）
function clearPermissionCache(): void {
  PropertiesService.getScriptProperties().deleteProperty(CACHE_FILE_ID_KEY);
  Logger.log('権限キャッシュをクリアしました。次回実行は全件取得になります');
}

// テスト用：先頭の少件数だけ取得し、別シート permissions_test に出力する。
// 認可・取得フィールド・権限の見え方を全件実行前に確認するための関数。
// ※ サンプルに親フォルダが含まれない場合、path にフォルダIDが出ることがある
function testExportSharedDrivePermissions(): void {
  const driveId =
    PropertiesService.getScriptProperties().getProperty(SHARED_DRIVE_ID_KEY);
  if (!driveId) {
    throw new Error(
      `スクリプトプロパティ ${SHARED_DRIVE_ID_KEY} に共有ドライブIDを設定してください`,
    );
  }
  Logger.log('SHARED_DRIVE_ID = %s', driveId);
  const driveName = getDriveName_(driveId);
  Logger.log('共有ドライブ名 = %s', driveName);
  const files = fetchAllFiles_(driveId, 50);
  Logger.log('取得ファイル数 = %s', files.length);
  // テストではキャッシュを使わず、サンプル分だけ権限を取得する
  const permissionsByFileId: {
    [fileId: string]: ReturnType<typeof fetchPermissions_>;
  } = {};
  for (const file of files) {
    if (file.id) {
      permissionsByFileId[file.id] = fetchPermissions_(file.id);
    }
  }
  // 先頭ファイルの権限（permissions.list が取れているか確認用）
  if (files.length && files[0].id) {
    Logger.log(
      '先頭ファイル %s の権限: %s',
      files[0].name,
      JSON.stringify(permissionsByFileId[files[0].id]),
    );
  }
  const rows = buildRows_(files, driveId, driveName, permissionsByFileId);
  writeToSheet_(rows, OUTPUT_SHEET_NAME + '_test');
  Logger.log(
    'テスト出力: %s ファイル / %s 行（ヘッダ含む）。出力先シート = %s',
    files.length,
    rows.length,
    OUTPUT_SHEET_NAME + '_test',
  );
}

// 週次の時間トリガーを作成する（手動で一度だけ実行）
function createWeeklyTrigger(): void {
  ScriptApp.newTrigger('exportSharedDrivePermissions')
    .timeBased()
    .everyWeeks(1)
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(3)
    .create();
}

// GASのエントリポイントとしてグローバルに公開する（トリガー・実行対象になる）
const globalScope = globalThis as {[key: string]: unknown};
globalScope.setupSharedDriveId = setupSharedDriveId;
globalScope.exportSharedDrivePermissions = exportSharedDrivePermissions;
globalScope.testExportSharedDrivePermissions = testExportSharedDrivePermissions;
globalScope.clearPermissionCache = clearPermissionCache;
globalScope.createWeeklyTrigger = createWeeklyTrigger;
