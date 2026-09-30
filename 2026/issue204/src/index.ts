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
import {
  EVENT_SHEET_NAME,
  SCHEDULE_SHEET_NAME,
  TASK_TEMPLATE_SHEET_NAME,
  TRIAL_MASTER_SHEET_NAME,
} from './constants';
import {refreshAll_, setupSheets_} from './sheet-service';

// 編集されたら更新処理を行うシート
const WATCHED_SHEETS = [
  TRIAL_MASTER_SHEET_NAME,
  TASK_TEMPLATE_SHEET_NAME,
  SCHEDULE_SHEET_NAME,
  EVENT_SHEET_NAME,
];

/**
 * スプレッドシートを開いたときにメニューを追加する（シンプルトリガー）。
 */
function onOpen(): void {
  SpreadsheetApp.getUi()
    .createMenu('スケジュール管理')
    .addItem('初期設定', 'setupSheets')
    .addItem('表示を更新', 'refreshView')
    .addToUi();
}

/**
 * セルを編集したときに、作業の追加・日付の計算・タイムライン用データの更新・行の表示切り替えを行う（シンプルトリガー）。
 */
function onEdit(e: GoogleAppsScript.Events.SheetsOnEdit): void {
  if (WATCHED_SHEETS.includes(e.range.getSheet().getName())) {
    refreshAll_();
  }
}

/**
 * メニュー「初期設定」: シートの作成と書式設定を行う。
 */
function setupSheets(): void {
  setupSheets_();
}

/**
 * メニュー「表示を更新」: 作業の追加・日付の計算・タイムライン用データの更新・行の表示切り替えを行う。
 */
function refreshView(): void {
  refreshAll_();
}
