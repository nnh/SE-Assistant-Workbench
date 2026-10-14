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
// ---- シート名 ----

// README へのリンクを置くシート名（一番左に置く）
export const README_SHEET_NAME = 'README';

// README のURL（master ブランチ）
export const README_URL =
  'https://github.com/nnh/SE-Assistant-Workbench/blob/master/2026/issue204/README.md';

// 研究管理システムから取り込んだ試験情報を置くシート名
export const TRIAL_INFO_SHEET_NAME = '試験情報マスタ';

// 試験の一覧（タイムライン表示の元データも兼ねる）
export const TRIAL_MASTER_SHEET_NAME = '試験一覧';

// ---- 試験一覧シート ----

// 終了日が空欄のとき、開始日から何か月分のバーを引くか（カレンダー上の月数）
export const TIMELINE_MONTHS = 4;

// A〜D 列は手入力、E〜G 列は数式で自動計算
// 開始日・終了日は手入力（記録として残す）、タイムライン開始・終了はタイムライン表示用（非表示なら空欄）
export const TRIAL_MASTER_HEADERS = [
  '試験名',
  '表示状態',
  '開始日',
  // 空欄でもよいこと・空欄のときの扱いが分かるよう、見出しに書いておく
  `終了日（空欄なら開始日+${TIMELINE_MONTHS}か月）`,
  '表示名',
  'タイムライン開始',
  'タイムライン終了',
];

// 列（1始まり）
export const TRIAL_NAME_COLUMN = 1;
export const TRIAL_VISIBILITY_COLUMN = 2;
export const TRIAL_START_COLUMN = 3;
export const TRIAL_END_COLUMN = 4;
export const TRIAL_DISPLAY_NAME_COLUMN = 5;
export const TRIAL_TIMELINE_START_COLUMN = 6;
export const TRIAL_TIMELINE_END_COLUMN = 7;

// 終了日のセルを選んだときに表示する説明（入力規則のヘルプテキスト）
export const END_DATE_HELP_TEXT = `日付を入力してください。空欄の場合、タイムラインには開始日の${TIMELINE_MONTHS}か月後まで表示されます。`;

// 開始日が空欄の試験の表示名（タイムラインのカードのタイトル）に付ける文字
export const SCHEDULE_UNDECIDED_SUFFIX = '（スケジュール未定）';

// 試験名があり非表示でないのに開始日が空欄のとき、開始日のセルに付ける背景色（条件付き書式）
export const MISSING_START_BACKGROUND = '#fff2cc';

// 自動計算の列（表示名〜タイムライン終了）にかける保護（編集時に警告を表示）の説明。
// 初期設定の再実行時に同じ保護を探して付け直すのにも使う
export const AUTO_COLUMNS_PROTECTION_DESCRIPTION =
  'この列は数式で自動計算しています。直接編集しないでください。';

// 以前の版でかけた保護の説明（初期設定の再実行時に外すため）
export const LEGACY_PROTECTION_DESCRIPTIONS = [
  '開始日・終了日は数式で自動計算しています。直接編集しないでください。',
  '開始日・終了日・表示名は数式で自動計算しています。直接編集しないでください。',
];

// 表示状態の選択肢（空欄は「表示」として扱う）
export const VISIBILITY_SHOWN = '表示';
export const VISIBILITY_HIDDEN = '非表示';

// 試験名のセルに付ける背景色（淡い色）。行番号に応じて順番に割り当て、足りなければ繰り返す
// タイムライン表示の「カードの色」に試験名の列を指定すると、バーの色になる
export const TRIAL_COLORS = [
  '#fde2e4',
  '#dcecc8',
  '#cfe8f3',
  '#fff1c1',
  '#e6dcf5',
  '#d4f0e2',
  '#ffe2cc',
  '#dde5fb',
];

// 未着色とみなす背景色（白）
export const NO_BACKGROUND = '#ffffff';

// 日付セルの表示形式
export const DATE_FORMAT = 'yyyy/mm/dd';

// ---- 研究管理システム（試験情報マスタ） ----

// 研究管理システムでこれらの状態の試験は、試験情報マスタに取り込まない
export const CLOSED_STATUSES = ['Completed', 'Stop', 'No Support'];

// 研究管理システムのURLを保存するスクリプトプロパティ名と、未設定時のダミー値
export const RESEARCH_SYSTEM_URL_PROPERTY = 'RESEARCH_SYSTEM_URL';
export const RESEARCH_SYSTEM_URL_DUMMY =
  'https://docs.google.com/spreadsheets/d/DUMMY/edit';

// 研究管理システムから取り込むシート・範囲（1行目のヘッダーは除く）
export const RESEARCH_SYSTEM_RANGE = 'Stat!A2:Q';

// Stat シートから取り込む列と、試験情報マスタでの見出し
// QUERY の Col 番号は取り込み範囲の先頭列(A)を1として数える（A, C, F, N, P, Q 列）
// 見出しは研究管理システム側の見出しに左右されないよう、ここで固定する
export const STAT_COLUMNS: [string, string][] = [
  ['Col1', 'プロトコルID'],
  ['Col3', '試験名'],
  ['Col6', '研究種別'],
  ['Col14', '状態'],
  ['Col16', 'FPI'],
  ['Col17', 'LPO'],
];

// 研究管理システム側の状態列（QUERY の Col 番号）
export const RESEARCH_SYSTEM_STATUS_COL = 'Col14';

// Datacenter シートから取り込む範囲
export const DATACENTER_RANGE = 'Datacenter!A:W';

// Datacenter シートから取り込む列（DATACENTER_RANGE の先頭列(A)を1とした列番号）と、試験情報マスタでの見出し
// T:登録開始, U:登録終了, V:中間用データ固定, W:追跡終了
export const DATACENTER_COLUMNS: [number, string][] = [
  [20, '登録開始'],
  [21, '登録終了'],
  [22, '中間用データ固定'],
  [23, '追跡終了'],
];

// 試験情報マスタの並び順（この見出しの列で、左から優先して昇順に並べる）
export const TRIAL_INFO_SORT_KEYS = ['追跡終了', '登録終了'];

// 試験情報マスタの日付列（1始まり、FPI〜追跡終了）
export const TRIAL_INFO_DATE_FIRST_COLUMN = 5;
export const TRIAL_INFO_DATE_LAST_COLUMN = 10;
