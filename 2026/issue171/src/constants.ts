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

// ---- スクリプトプロパティキー ----

/** CSVが格納されている Google Drive フォルダのID */
export const PROP_FOLDER_ID = 'FOLDER_ID';

/** 管理対象_集計の出力先スプレッドシートID（未設定時はアクティブスプレッドシート） */
export const PROP_SUMMARY_SPREADSHEET_ID = 'SUMMARY_SPREADSHEET_ID';

// ---- import-csv ----

/** 対象CSVファイル名のパターン。キャプチャ1=日時、キャプチャ2=ページ番号 */
export const FILE_PATTERN =
  /^collaborations_run_on_(\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2})_.+?_(\d+)\.csv$/;

// ---- distribute ----

/** 日時形式のシート名パターン */
export const DATE_SHEET_PATTERN = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}$/;

/** 元データの列インデックス（0始まり） */
export const C_INDEX = 2; // パス
export const D_INDEX = 3; // パスID
export const J_INDEX = 9; // コラボレータの種類

/** C列先頭から除去するプレフィックス */
export const C_PREFIX = 'すべてのファイル/';

/** 出力から除外する列インデックス（A, B, D, E, F, L） */
export const EXCLUDED_COLS = new Set([0, 1, 3, 4, 5, 11]);

/** 削除判定キーとなる出力列インデックス（パス=0, コラボレータのログイン=3, コラボレータ権限=5） */
export const KEY_COLS_OUT = [0, 3, 5];

/** ステータス列のヘッダー */
export const STATUS_COL_HEADER = 'ステータス';

/** 削除済を示すステータスプレフィックス */
export const STATUS_DELETED = '削除済';

/** J列（コラボレータの種類）の振り分け値 */
export const J_VALUE_MANAGED = '管理対象';
export const J_VALUE_EXTERNAL = '外部';

/** 出力先シート名 */
export const SHEET_NAME_MANAGED = '管理対象一覧';
export const SHEET_NAME_EXTERNAL = '外部一覧';
export const SHEET_NAME_MANAGED_SUMMARY = 'Boxグループ';

/** 管理対象_集計のタイトル（1行目） */
export const SUMMARY_TITLE = 'グループアクセス権一覧（Box）';

/** 管理対象_集計の固定列（B列） */
export const SUMMARY_FIXED_COL_HEADER = 'システム管理者';
export const SUMMARY_FIXED_COL_VALUE = 'オーナー';

/**
 * 管理対象_集計シートの列幅（ピクセル）。出力列の順に指定する。0 の場合は自動調整。空配列は全列自動調整。
 */
export const SUMMARY_COLUMN_WIDTHS: readonly number[] = [
  130, 130, 80, 80, 130, 130, 80, 80, 80, 80, 130, 80,
];

/**
 * 出力列の幅（ピクセル）。出力列の順に指定する。0 の場合は自動調整。空配列は全列自動調整。
 * 例: [200, 0, 100] → 1列目200px, 2列目自動, 3列目100px
 */
export const COLUMN_WIDTHS: readonly number[] = [
  610, 80, 180, 260, 130, 120, 80, 80, 0,
];
