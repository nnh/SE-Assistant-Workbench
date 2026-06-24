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
  CHECK_FILE_ID_KEY,
  OUTPUT_SHEET_NAME,
  CACHE_FILE_ID_KEY,
  NOTES_SHEET_NAME,
  NOTES_DESCRIPTION_OPTIONS,
  HEADER,
} from './constants';
import {
  getDriveName_,
  fetchAllFiles_,
  fetchPermissions_,
  buildRows_,
  readNotes_,
  writeToSheet_,
  setColumnRichText_,
  deleteSheetIfExists_,
  loadCache_,
  saveCache_,
  resolvePermissions_,
  permissionsFromCache_,
  nowString_,
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
  // 旧仕様の生データシートが残っていれば削除（セル数の節約）
  deleteSheetIfExists_('permissions_raw');
  const driveName = getDriveName_(driveId);
  const files = fetchAllFiles_(driveId);
  const cache = loadCache_();
  // 時間予算内で取得し、できたところまで出力する（残りは次回実行で取得）
  const {permissionsByFileId, fetchedAtByFileId, newCache, fetched, remaining} =
    resolvePermissions_(files, cache);
  saveCache_(newCache);
  const rawRows = buildRows_(
    files,
    driveId,
    driveName,
    permissionsByFileId,
    fetchedAtByFileId,
  );
  const out = formatRows_(rawRows, readNotes_());
  writeToSheet_(out.values, OUTPUT_SHEET_NAME);
  setColumnRichText_(OUTPUT_SHEET_NAME, out.richColumnIndex, out.richTexts);
  console.log(
    `今回取得 ${fetched} 件 / 残り ${remaining} 件 ` +
      (remaining ? '（未完了：再実行で続きを取得）' : '（完了）'),
  );
}

// 権限を取得し直さず、キャッシュ済みの権限とファイル一覧から整形し直して
// permissions シートへ出力する。フォーマット・備考だけ反映したいときに使う
function formatPermissions(): void {
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
  // キャッシュにある権限だけを使う（permissions.list は呼ばない）
  const {permissionsByFileId, fetchedAtByFileId} = permissionsFromCache_(
    files,
    cache,
  );
  const rawRows = buildRows_(
    files,
    driveId,
    driveName,
    permissionsByFileId,
    fetchedAtByFileId,
  );
  const out = formatRows_(rawRows, readNotes_());
  writeToSheet_(out.values, OUTPUT_SHEET_NAME);
  setColumnRichText_(OUTPUT_SHEET_NAME, out.richColumnIndex, out.richTexts);
  console.log(`整形のみ実行（キャッシュから再構築）: ${rawRows.length} 明細行`);
}

// 作業用：スクリプトプロパティ CHECK_FILE_ID のファイルの権限をログに出す
function checkFilePermissions(): void {
  const fileId =
    PropertiesService.getScriptProperties().getProperty(CHECK_FILE_ID_KEY);
  if (!fileId) {
    throw new Error(
      `スクリプトプロパティ ${CHECK_FILE_ID_KEY} に確認したいファイルIDを設定してください`,
    );
  }
  const permissions = fetchPermissions_(fileId);
  console.log(
    `${fileId} の権限（${permissions.length}件）: ` +
      JSON.stringify(permissions),
  );
}

// 作業用：備考シートC列(説明)に入力規則を設定する（指定2値のみ・それ以外は不可）
function setNotesValidation(): void {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOTES_SHEET_NAME);
  if (!sheet) {
    throw new Error(`シート ${NOTES_SHEET_NAME} が見つかりません`);
  }
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(NOTES_DESCRIPTION_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  // 1行目は見出しなので2行目以降のC列に適用
  const numRows = sheet.getMaxRows() - 1;
  if (numRows < 1) {
    return;
  }
  sheet.getRange(2, 3, numRows, 1).setDataValidation(rule);
  console.log(`備考シートC列に入力規則を設定しました（${numRows} 行）`);
}

// 作業用：結果シートに条件付き書式（行全体の背景色）を設定する。
// F列(説明)が指定値のとき、D列(種類)が「フォルダ」のときで色分けする
function setListConditionalFormatting(): void {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(OUTPUT_SHEET_NAME);
  if (!sheet) {
    throw new Error(`シート ${OUTPUT_SHEET_NAME} が見つかりません`);
  }
  const numRows = sheet.getMaxRows() - 1; // 1行目は見出し
  if (numRows < 1) {
    return;
  }
  // ヘッダ行を除く全列を対象（行全体に色を付ける）
  const range = sheet.getRange(2, 1, numRows, HEADER.length);

  // 備考(F列)が指定値のとき：薄い黄色
  const notesFormula =
    `=OR($F2="${NOTES_DESCRIPTION_OPTIONS[0]}",` +
    `$F2="${NOTES_DESCRIPTION_OPTIONS[1]}")`;
  const notesRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(notesFormula)
    .setBackground('#FFF2CC')
    .setRanges([range])
    .build();

  // 種類(D列)がフォルダのとき：濃いめの青＋太字でファイルと区別しやすくする
  const folderRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$D2="フォルダ"')
    .setBackground('#9FC5E8')
    .setBold(true)
    .setRanges([range])
    .build();

  // 既存の条件付き書式は置き換える（備考を優先）
  sheet.setConditionalFormatRules([notesRule, folderRule]);
  console.log('結果シートに条件付き書式を設定しました');
}

// 作業用：備考シートで、A列のファイルIDが結果シートB列に存在しない行を色付けする
function setNotesOrphanFormatting(): void {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOTES_SHEET_NAME);
  if (!sheet) {
    throw new Error(`シート ${NOTES_SHEET_NAME} が見つかりません`);
  }
  const numRows = sheet.getMaxRows() - 1; // 1行目は見出し
  if (numRows < 1) {
    return;
  }
  // A〜C列（行全体）を対象にする
  const range = sheet.getRange(2, 1, numRows, 3);
  // A列が空でなく、結果シートB列に同じIDが無ければ該当。
  // 条件付き書式は他シートを直接参照できないため INDIRECT で参照する
  const formula =
    '=AND($A2<>"",' +
    `COUNTIF(INDIRECT("'${OUTPUT_SHEET_NAME}'!$B:$B"),$A2)=0)`;
  const rule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(formula)
    .setBackground('#F4CCCC')
    .setRanges([range])
    .build();
  // 既存の条件付き書式は置き換える（再実行で重複しない）
  sheet.setConditionalFormatRules([rule]);
  console.log(
    '備考シートに「一覧に無いファイルID」の条件付き書式を設定しました',
  );
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
  const fetchedAtByFileId: {[fileId: string]: string} = {};
  const fetchedAt = nowString_();
  for (const file of files) {
    if (file.id) {
      permissionsByFileId[file.id] = fetchPermissions_(file.id);
      fetchedAtByFileId[file.id] = fetchedAt;
    }
  }
  // 先頭ファイルの権限（permissions.list が取れているか確認用）
  if (files.length && files[0].id) {
    console.log(
      `先頭ファイル ${files[0].name} の権限: ` +
        JSON.stringify(permissionsByFileId[files[0].id]),
    );
  }
  const rawRows = buildRows_(
    files,
    driveId,
    driveName,
    permissionsByFileId,
    fetchedAtByFileId,
  );
  const testSheetName = OUTPUT_SHEET_NAME + '_test';
  const out = formatRows_(rawRows, readNotes_());
  writeToSheet_(out.values, testSheetName);
  setColumnRichText_(testSheetName, out.richColumnIndex, out.richTexts);
  console.log(
    `テスト出力: ${files.length} ファイル / ${out.values.length} 行（ヘッダ含む）。` +
      `出力先シート = ${testSheetName}`,
  );
}

// GASのエントリポイントとしてグローバルに公開する（トリガー・実行対象になる）
const globalScope = globalThis as {[key: string]: unknown};
globalScope.onOpen = onOpen;
globalScope.setupSharedDriveId = setupSharedDriveId;
globalScope.exportSharedDrivePermissions = exportSharedDrivePermissions;
globalScope.formatPermissions = formatPermissions;
globalScope.testExportSharedDrivePermissions = testExportSharedDrivePermissions;
globalScope.checkFilePermissions = checkFilePermissions;
globalScope.setNotesValidation = setNotesValidation;
globalScope.setListConditionalFormatting = setListConditionalFormatting;
globalScope.setNotesOrphanFormatting = setNotesOrphanFormatting;
globalScope.clearPermissionCache = clearPermissionCache;
