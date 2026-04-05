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
import * as consts from './consts';

/**
 * ツール実行に必要なシート作成と初期設定を行う関数です。
 * 既存の全シートを削除し、完全にリセットした状態でシートを再生成します。
 */
export function initializeProject_(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // --- 0. 全シートの削除（リセット処理） ---
  // 一時的なダミーシートを作成（シートが0枚になるのを防ぐため）
  const dummySheet = ss.insertSheet('temp_dummy');
  const sheets = ss.getSheets();

  for (const sheet of sheets) {
    if (sheet.getName() !== 'temp_dummy') {
      ss.deleteSheet(sheet);
    }
  }

  // --- 1. 各シートの作成とヘッダー設定 ---

  // --- 「共有権限」シート ---
  const resultSheet = ss.insertSheet(consts.SHEET_NAME.PERMISSION);
  const mainHeader = [
    'タイプ',
    'パス',
    '名前',
    'ID',
    'URL',
    'アクセス種別',
    '権限',
    'オーナー',
    '編集者',
    '閲覧者',
    'ショートカット元フォルダID',
  ];
  resultSheet.getRange(1, 1, 1, mainHeader.length).setValues([mainHeader]);
  resultSheet.setFrozenRows(1);

  // --- 「検索済み」シート ---
  const doneSheet = ss.insertSheet(consts.SHEET_NAME.DONE);
  const doneHeader = ['ID', 'パス'];
  doneSheet.getRange(1, 1, 1, doneHeader.length).setValues([doneHeader]);
  doneSheet.setFrozenRows(1);

  // --- 「検索対象外フォルダ」シート ---
  const excludeSheet = ss.insertSheet(consts.SHEET_NAME.SEARCH_EXCLUDE);
  const excludeHeader = ['対象外フォルダID', '備考'];
  excludeSheet
    .getRange(1, 1, 1, excludeHeader.length)
    .setValues([excludeHeader]);
  excludeSheet.setFrozenRows(1);

  // --- 2. 分割後のサブシートも作成（transformer用） ---
  ss.insertSheet(consts.SHEET_NAME.BASIC_INFO);
  ss.insertSheet(consts.SHEET_NAME.ACCESS_INFO);
  ss.insertSheet(consts.SHEET_NAME.EDITOR_LIST);
  ss.insertSheet(consts.SHEET_NAME.VIEWER_LIST);
  ss.insertSheet(consts.SHEET_NAME.EXTERNAL_SHARED_ITEMS);
  ss.insertSheet(consts.SHEET_NAME.EXTERNAL_SHARED_FOLDERS);
  ss.insertSheet(consts.SHEET_NAME.EXTERNAL_SHARED_FILES);

  // ダミーシートを削除して完了
  ss.deleteSheet(dummySheet);

  // --- 3. スクリプトプロパティの雛形作成 ---
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(consts.PROP_KEY.TARGET_ROOT_FOLDER_ID)) {
    props.setProperty(
      consts.PROP_KEY.TARGET_ROOT_FOLDER_ID,
      consts.LABEL.FOLDER_ID_HERE
    );
  }

  console.log('✅ 全シートをリセットし、初期セットアップが完了しました。');
  SpreadsheetApp.getUi().alert(
    'シートを完全にリセットしました。設定を確認してください。'
  );
}
