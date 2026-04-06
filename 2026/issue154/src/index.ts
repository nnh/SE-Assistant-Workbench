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
import { hello } from './example-module';
import { execSetProperties_ } from './configService';
import { exportFolderPermissionsRecursive_ } from './permissionService';
import { initializeProject_ } from './setup';
import { splitPermissionData_, outputFolderList_ } from './transformer';
import { mergeSheetsById_ } from './merger';
import { createAndMoveFolders_ } from './folderUtils';
import * as consts from './consts';

/**
 * 外部共有フォルダリストの情報からフォルダを指定の場所に移動します。
 * @returns
 */
function createAndMoveFolders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inputSheet = ss.getSheetByName(
    consts.SHEET_NAME.EXTERNAL_SHARED_FOLDERS
  );
  if (!inputSheet) {
    console.error(
      `シート「${consts.SHEET_NAME.EXTERNAL_SHARED_FOLDERS}」が見つかりません。フォルダ作成および移動を中止します。`
    );
    return;
  }
  createAndMoveFolders_(inputSheet);
}
/**
 * exportFolderPermissionsRecursiveで取得した共有権限情報を
 * 用途別の各シート（基本情報、アクセス種別、編集者、閲覧者）へ分割・出力します。
 * 複数のシートに分散しているデータをIDをキーにして統合し、1つのシートにまとめます。
 * 基本情報シート、アクセス種別シート、編集者シート、閲覧者シートからIDを基にデータを結合して外部共有アイテムリストシートに出力します。
 * タイプが「フォルダ」の行を「外部共有フォルダリスト」シートに出力します。
 */
function splitPermissionData() {
  splitPermissionData_();
  const data = mergeSheetsById_();
  outputFolderList_(data, consts.SHEET_NAME.EXTERNAL_SHARED_FOLDERS);
  // 基本情報シート、アクセス種別シート、編集者シート、閲覧者シート、外部共有ファイルリストを非表示にする
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetsToHide = [
    consts.SHEET_NAME.BASIC_INFO,
    consts.SHEET_NAME.ACCESS_INFO,
    consts.SHEET_NAME.EDITOR_LIST,
    consts.SHEET_NAME.VIEWER_LIST,
    consts.SHEET_NAME.EXTERNAL_SHARED_FILES,
  ];
  for (const sheetName of sheetsToHide) {
    const sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      sheet.hideSheet();
    }
  }
}
/**
 * 指定したルートフォルダ配下を再帰的に走査し、共有権限情報をスプレッドシートに書き出します。
 */
function exportFolderPermissionsRecursive() {
  execSetProperties_();
  exportFolderPermissionsRecursive_();
}
/**
 * ツール実行に必要なシート作成と初期設定を行う関数です。
 * 初回実行時、またはシートをリセットしたい時に使用してください。
 */
function setup() {
  initializeProject_();
}
console.log(hello());
