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
// 検索対象フォルダIDを保持するスクリプトプロパティのキー
export const PROPERTY_KEY_FOLDER_ID = 'FOLDER_ID';

// 出力先シート名
export const OUTPUT_SHEET_NAME = 'SpreadsheetList';

// 出力シートのヘッダー行
export const OUTPUT_HEADER = ['ファイル名', 'ID', 'URL'];

// 抽出対象のスプレッドシートID一覧が入力されているシート名
export const TARGET_SHEET_NAME = '抽出対象シート';

// 抽出対象シートのうち、スプレッドシートIDが入っている列(0始まり、B列)
export const TARGET_ID_COLUMN_INDEX = 1;

// 共有権限が記載されているシート名
export const SHARE_SHEET_NAME = '共有権限';

// 共有権限シートのうち、フィルタ条件に使う列(0始まり、F列)
export const SHARE_FILTER_COLUMN_INDEX = 5;

// 共有権限シートのフィルタで除外する値
export const SHARE_FILTER_EXCLUDE_VALUE = 'PRIVATE';

// 共有権限抽出結果の出力先シート名
export const SHARE_EXTRACT_OUTPUT_SHEET_NAME = '（移動前）共有権限抽出結果';

// ARO外部共有ファイル一覧が入っているスプレッドシートIDを保持するスクリプトプロパティのキー
export const PROPERTY_KEY_ARO_SPREADSHEET_ID = 'ARO_SPREADSHEET_ID';

// ARO外部共有ファイル一覧が記載されているシート名
export const ARO_SHEET_NAME = 'ARO外部共有ファイル一覧';

// ARO外部共有ファイル一覧シートのうち、フィルタ条件に使う列(0始まり、E列)
export const ARO_FILTER_COLUMN_INDEX = 4;

// ARO外部共有ファイル一覧シートのフィルタで抽出する値
export const ARO_FILTER_VALUE = 'リンクを知っている全員';

// ARO外部共有リンク抽出結果の出力先シート名
export const ARO_EXTRACT_OUTPUT_SHEET_NAME =
  '（移動後）外部共有リンクを知っている全員';

// 差分抽出の比較元シート(共有権限抽出結果)のうち、比較に使う列(0始まり、D列)
export const DIFF_SOURCE_COLUMN_INDEX = 3;

// 差分抽出の比較先シート(外部共有リンクを知っている全員)のうち、比較に使う列(0始まり、B列)
export const DIFF_COMPARISON_COLUMN_INDEX = 1;

// 差分抽出結果の出力先シート名
export const DIFF_OUTPUT_SHEET_NAME = '差分抽出結果';

// 差分抽出の比較元シート(共有権限抽出結果)のうち、フィルタ条件に使う列(0始まり、F列)
export const DIFF_SOURCE_FILTER_COLUMN_INDEX = 5;

// 差分抽出の比較元シートのフィルタで一致させる値
export const DIFF_SOURCE_FILTER_VALUE = 'ANYONE_WITH_LINK';

// 差分抽出結果シートのうち、ファイル名が入っている列(0始まり、C列)
export const DIFF_RESULT_FILE_NAME_COLUMN_INDEX = 2;

// 差分抽出結果シートのうち、URLが入っている列(0始まり、E列)
export const DIFF_RESULT_URL_COLUMN_INDEX = 4;

// ARO外部共有ファイル一覧シートのうち、パスが入っている列(0始まり、A列)
export const ARO_PATH_COLUMN_INDEX = 0;

// ARO外部共有ファイル一覧シートのうち、IDが入っている列(0始まり、B列)
export const ARO_ID_COLUMN_INDEX = 1;

// パス付き差分抽出結果の出力先シート名
export const PATH_LOOKUP_OUTPUT_SHEET_NAME = 'パス付き差分抽出結果';

// パス付き差分抽出結果の見出し行
export const PATH_LOOKUP_HEADER = ['パス', 'ID', 'ファイル名', 'URL'];

// パス付き差分抽出結果シートのうち、パスが入っている列(0始まり、A列)
export const PATH_LOOKUP_PATH_COLUMN_INDEX = 0;

// パス付き差分抽出結果シートのうち、IDが入っている列(0始まり、B列)
export const PATH_LOOKUP_ID_COLUMN_INDEX = 1;

// ファイルが見つからない、またはアクセス権がない場合にパス欄へ出力する値
export const FILE_PATH_ERROR_VALUE = '取得エラー';

// パスの表示名を置き換える対象(ルートフォルダ名)
export const FILE_PATH_DISPLAY_NAME_SEARCH = '/ドライブ/';

// パスの表示名の置き換え後の文字列
export const FILE_PATH_DISPLAY_NAME_REPLACEMENT = '/ARO内部のみ共有/';
