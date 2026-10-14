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
/* eslint-disable @typescript-eslint/no-unused-vars */
// エントリポイント（トリガー関数・メニューから呼ぶ関数）
import {colorTrialNamesOnEdit_, setupSheets_} from './sheet-service';

/**
 * スプレッドシートを開いたときにメニューを追加する（シンプルトリガー）。
 */
function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu('初期設定')
    .addItem('初期設定を実行', 'setupSheets')
    .addToUi();
}

/**
 * セルを編集したときに、試験一覧の試験名に淡い色を付ける（シンプルトリガー）。
 */
function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit): void {
  colorTrialNamesOnEdit_(e);
}

/**
 * メニュー「初期設定」: シートの作成と書式・数式の設定を行う。
 */
function setupSheets(): void {
  setupSheets_();
}
