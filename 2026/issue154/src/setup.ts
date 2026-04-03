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
 * 初回実行時、またはシートをリセットしたい時に使用してください。
 */
export function initializeProject_(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 各シートの作成とヘッダー設定

  // --- 「共有権限」シート ---
  let resultSheet = ss.getSheetByName(consts.SHEET_NAME.PERMISSION);
  if (!resultSheet) {
    resultSheet = ss.insertSheet(consts.SHEET_NAME.PERMISSION);
  }
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
  resultSheet.setFrozenRows(1); // 1行目を固定

  // --- 「検索済み」シート ---
  let doneSheet = ss.getSheetByName(consts.SHEET_NAME.DONE);
  if (!doneSheet) {
    doneSheet = ss.insertSheet(consts.SHEET_NAME.DONE);
  }
  const doneHeader = ['ID', 'パス'];
  doneSheet.getRange(1, 1, 1, doneHeader.length).setValues([doneHeader]);
  doneSheet.setFrozenRows(1); // 1行目を固定

  // --- 「対象外フォルダ」シート ---
  let excludeSheet = ss.getSheetByName(consts.SHEET_NAME.EXCLUDE);
  if (!excludeSheet) {
    excludeSheet = ss.insertSheet(consts.SHEET_NAME.EXCLUDE);
  }
  const excludeHeader = ['対象外フォルダID', '備考'];
  excludeSheet
    .getRange(1, 1, 1, excludeHeader.length)
    .setValues([excludeHeader]);
  excludeSheet.setFrozenRows(1); // 1行目を固定

  // 2. スクリプトプロパティの雛形作成
  const props = PropertiesService.getScriptProperties();
  if (!props.getProperty(consts.PROP_KEY.TARGET_ROOT_FOLDER_ID)) {
    // 便宜上、空の値をセット（ユーザーに設定を促すため）
    props.setProperty(
      consts.PROP_KEY.TARGET_ROOT_FOLDER_ID,
      consts.LABEL.FOLDER_ID_HERE
    );
  }

  console.log('✅ 初期セットアップが完了しました。');
  console.log(
    '1. 「対象外フォルダ」シートにスキップしたいIDを入力してください。'
  );
  console.log(
    `2. スクリプトプロパティに "${consts.PROP_KEY.TARGET_ROOT_FOLDER_ID}" を設定してください。`
  );

  SpreadsheetApp.getUi().alert(
    '初期セットアップが完了しました。シートを確認してください。'
  );
}
