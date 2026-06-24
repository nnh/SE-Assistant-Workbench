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
  OUTPUT_RAW_SHEET_NAME,
  CACHE_FILE_ID_KEY,
} from './constants';
import {
  getDriveName_,
  fetchAllFiles_,
  fetchPermissions_,
  buildRows_,
  rawRowsToValues_,
  readRawRows_,
  readNotes_,
  writeToSheet_,
  loadCache_,
  saveCache_,
  resolvePermissions_,
} from './functions';
import {formatRows_} from './format';

// スプレッドシートを開いたときにメニューを追加する（本番エクスポートのみ）
function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu('権限エクスポート')
    .addItem('権限一覧を出力', 'exportSharedDrivePermissions')
    .addToUi();
}

// 初期設定：スクリプトプロパティ SHARED_DRIVE_ID が無ければダミー値で作成する。
// 作成後にエディタの設定画面から実際の共有ドライブIDへ書き換える
function setupSharedDriveId(): void {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(SHARED_DRIVE_ID_KEY)) {
    console.log(`${SHARED_DRIVE_ID_KEY} は既に設定済みです`);
    return;
  }
  properties.setProperty(SHARED_DRIVE_ID_KEY, 'dummy');
  console.log(`${SHARED_DRIVE_ID_KEY} をダミー値で作成しました`);
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
  // 時間予算内で取得し、できたところまで出力する（残りは次回実行で取得）
  const {permissionsByFileId, newCache, fetched, remaining} =
    resolvePermissions_(files, cache);
  saveCache_(newCache);
  const rawRows = buildRows_(files, driveId, driveName, permissionsByFileId);
  // 生データシートと整形済みシート（備考付き）の両方を出力する
  writeToSheet_(rawRowsToValues_(rawRows), OUTPUT_RAW_SHEET_NAME);
  writeToSheet_(formatRows_(rawRows, readNotes_()), OUTPUT_SHEET_NAME);
  console.log(
    `今回取得 ${fetched} 件 / 残り ${remaining} 件 ` +
      (remaining ? '（未完了：再実行で続きを取得）' : '（完了）'),
  );
}

// 生データシート(permissions_raw)を読み込み、整形し直して permissions シートへ出力する。
// 取得し直さずにフォーマット・備考だけ反映したいときに使う
function formatPermissions(): void {
  const rawRows = readRawRows_(OUTPUT_RAW_SHEET_NAME);
  writeToSheet_(formatRows_(rawRows, readNotes_()), OUTPUT_SHEET_NAME);
  console.log(`整形のみ実行: ${rawRows.length} 行（ヘッダ除く）`);
}

// 権限キャッシュの参照を消し、次回実行を全件取得に戻す（取りこぼし時の手動フル再取得）
function clearPermissionCache(): void {
  PropertiesService.getScriptProperties().deleteProperty(CACHE_FILE_ID_KEY);
  console.log('権限キャッシュをクリアしました。次回実行は全件取得になります');
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
  console.log(`SHARED_DRIVE_ID = ${driveId}`);
  const driveName = getDriveName_(driveId);
  console.log(`共有ドライブ名 = ${driveName}`);
  const files = fetchAllFiles_(driveId, 50);
  console.log(`取得ファイル数 = ${files.length}`);
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
    console.log(
      `先頭ファイル ${files[0].name} の権限: ` +
        JSON.stringify(permissionsByFileId[files[0].id]),
    );
  }
  const rawRows = buildRows_(files, driveId, driveName, permissionsByFileId);
  const rows = formatRows_(rawRows, readNotes_());
  writeToSheet_(rows, OUTPUT_SHEET_NAME + '_test');
  console.log(
    `テスト出力: ${files.length} ファイル / ${rows.length} 行（ヘッダ含む）。` +
      `出力先シート = ${OUTPUT_SHEET_NAME}_test`,
  );
}

// GASのエントリポイントとしてグローバルに公開する（トリガー・実行対象になる）
const globalScope = globalThis as {[key: string]: unknown};
globalScope.onOpen = onOpen;
globalScope.setupSharedDriveId = setupSharedDriveId;
globalScope.exportSharedDrivePermissions = exportSharedDrivePermissions;
globalScope.formatPermissions = formatPermissions;
globalScope.testExportSharedDrivePermissions = testExportSharedDrivePermissions;
globalScope.clearPermissionCache = clearPermissionCache;
