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

import {
  PROP_SUMMARY_SPREADSHEET_ID,
  SHEET_NAME_MANAGED,
  SHEET_NAME_MANAGED_SUMMARY,
  STATUS_DELETED,
  SUMMARY_COLUMN_WIDTHS,
  SUMMARY_FIXED_COL_HEADER,
  SUMMARY_FIXED_COL_VALUE,
  SUMMARY_TITLE,
} from './constants';
import { resizeColumns_ } from './distribute';

// 管理対象一覧シートの列インデックス（0始まり）
const ROW_COL = 0; // A列: パス
const COL_COL = 2; // C列: コラボレータ名
const VAL_COL = 5; // F列: コラボレータ権限
const STATUS_COL = 9; // J列: ステータス

export function summarizeManagedSheet_(): void {
  const activeSs = SpreadsheetApp.getActiveSpreadsheet();
  const source = activeSs.getSheetByName(SHEET_NAME_MANAGED);
  if (!source) return;

  const data = source.getDataRange().getValues() as string[][];
  if (data.length <= 1) return;

  // ヘッダーを除き、削除済を除外
  const body = data
    .slice(1)
    .filter(row => !String(row[STATUS_COL] ?? '').startsWith(STATUS_DELETED));

  const pivotData = buildPivot_(body);

  // 出力先スプレッドシート（プロパティ未設定時はアクティブスプレッドシート）
  const summarySpreadsheetId =
    PropertiesService.getScriptProperties().getProperty(
      PROP_SUMMARY_SPREADSHEET_ID
    );
  const targetSs = summarySpreadsheetId
    ? SpreadsheetApp.openById(summarySpreadsheetId)
    : activeSs;

  let sheet = targetSs.getSheetByName(SHEET_NAME_MANAGED_SUMMARY);
  if (!sheet) {
    sheet = targetSs.insertSheet(SHEET_NAME_MANAGED_SUMMARY);
  } else {
    sheet.clearContents();
  }

  // A1: タイトル（太字）
  const titleRange = sheet.getRange(1, 1);
  titleRange.setValue(SUMMARY_TITLE);
  titleRange.setFontWeight('bold');

  // A2: 実行日時
  sheet.getRange(2, 1).setValue(formatDate_(new Date()));

  // 3行目から集計表を出力
  sheet
    .getRange(3, 1, pivotData.length, pivotData[0].length)
    .setValues(pivotData);

  // 3行目のヘッダーを太字
  sheet.getRange(3, 1, 1, pivotData[0].length).setFontWeight('bold');

  // 1〜3行目を固定
  sheet.setFrozenRows(3);
  sheet.setFrozenColumns(1);
  resizeColumns_(sheet, pivotData[0].length, SUMMARY_COLUMN_WIDTHS);
}

export function buildPivot_(body: string[][]): string[][] {
  // 行・列ラベルを出現順に収集（重複排除）
  const rowKeys = [...new Set(body.map(r => r[ROW_COL]))];
  const colKeys = [...new Set(body.map(r => r[COL_COL]))];

  // (パス, コラボレータ名) → コラボレータ権限 のマップ
  const valueMap = new Map<string, string>();
  for (const row of body) {
    const key = `${row[ROW_COL]}\0${row[COL_COL]}`;
    if (!valueMap.has(key)) {
      valueMap.set(key, row[VAL_COL]);
    }
  }

  const header = ['', SUMMARY_FIXED_COL_HEADER, ...colKeys];
  const rows = rowKeys.map(rowKey => [
    rowKey,
    SUMMARY_FIXED_COL_VALUE,
    ...colKeys.map(colKey => valueMap.get(`${rowKey}\0${colKey}`) ?? ''),
  ]);

  return [header, ...rows];
}

export function formatDate_(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  // JST = UTC+9
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return (
    `${jst.getUTCFullYear()}/${pad(jst.getUTCMonth() + 1)}/${pad(jst.getUTCDate())} ` +
    `${pad(jst.getUTCHours())}:${pad(jst.getUTCMinutes())}:${pad(jst.getUTCSeconds())}`
  );
}
