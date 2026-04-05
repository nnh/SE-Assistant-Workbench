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
import { createFolders_ } from './folderUtils';
import * as consts from './consts';

/**
 * 外部共有フォルダリストシートのB列の情報から、移動先のフォルダIDを取得してL列に出力します。
 * フォルダが存在しない場合は新規作成します。
 * @returns
 */
function createFolders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inputSheet = ss.getSheetByName(
    consts.SHEET_NAME.EXTERNAL_SHARED_FOLDERS
  );
  if (!inputSheet) {
    console.error(
      `シート「${consts.SHEET_NAME.EXTERNAL_SHARED_FOLDERS}」が見つかりません。フォルダ作成を中止します。`
    );
    return;
  }
  createFolders_(inputSheet);
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
