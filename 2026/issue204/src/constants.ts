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

// 試験の一覧（略称・表示状態・LPO・データロック・備考）
export const TRIAL_MASTER_SHEET_NAME = '試験一覧';

// 作業の標準期間と並べ方のルール
export const TASK_TEMPLATE_SHEET_NAME = '作業テンプレート';

// 試験ごとの作業と期間（開始日・完了日は自動計算）
export const SCHEDULE_SHEET_NAME = 'スケジュール';

// イベント名の一覧（イベントシートのプルダウン用）
export const EVENT_MASTER_SHEET_NAME = 'イベント一覧';

// 試験ごとのイベントの日付（手入力）
export const EVENT_SHEET_NAME = 'イベント';

// タイムライン表示の元データを書き出すシート名（スクリプトが自動生成する）
export const TIMELINE_SHEET_NAME = 'タイムライン用データ';

// ---- 試験一覧シート ----

export const TRIAL_MASTER_HEADERS = [
  '略称',
  '表示状態',
  'LPO',
  'データロック',
  '備考',
];

// 列（1始まり）
export const TRIAL_NAME_COLUMN = 1;
export const TRIAL_VISIBILITY_COLUMN = 2;
export const TRIAL_LPO_COLUMN = 3;
export const TRIAL_DATA_LOCK_COLUMN = 4;

// 表示状態の選択肢（空欄は「表示」として扱う）
export const VISIBILITY_SHOWN = '表示';
export const VISIBILITY_HIDDEN = '非表示';

// タイムラインに出す基準日のイベント名
export const LPO_LABEL = 'LPO';
export const DATA_LOCK_LABEL = 'データロック';

// ---- 作業テンプレートシート ----

export const TASK_TEMPLATE_HEADERS = [
  '作業',
  '基準',
  '順番',
  '標準期間',
  '単位',
];

// 基準は「〇〇前」「〇〇後」の形（〇〇は LPO・データロック・イベント一覧のイベント）
// 〇〇前: 基準日の前営業日から順番の降順に逆算して詰める（同じ順番は完了日を揃える）
// 〇〇後: 基準日の翌営業日から順番の昇順に前向きに詰める（同じ順番は開始日を揃える）
export const BASE_SUFFIX_BEFORE = '前';
export const BASE_SUFFIX_AFTER = '後';
export const BASE_AFTER_LPO = `${LPO_LABEL}${BASE_SUFFIX_AFTER}`;
export const BASE_BEFORE_DATA_LOCK = `${DATA_LOCK_LABEL}${BASE_SUFFIX_BEFORE}`;
export const BASE_AFTER_DATA_LOCK = `${DATA_LOCK_LABEL}${BASE_SUFFIX_AFTER}`;

// 期間の単位と、1単位あたりの営業日数（1人が専任で担当する前提）
export const UNIT_PERSON_DAY = '人日';
export const UNIT_PERSON_MONTH = '人月';
export const BUSINESS_DAYS_PER_UNIT: Record<string, number> = {
  [UNIT_PERSON_DAY]: 1,
  [UNIT_PERSON_MONTH]: 20,
};

// 初期設定時に作業テンプレートシートへ書き込む標準の作業（作業, 基準, 順番, 標準期間, 単位）
// 期間は仮の目安。シート上で調整する
export const DEFAULT_TASK_TEMPLATES: (string | number)[][] = [
  ['SDTMマッピング仕様書作成', BASE_BEFORE_DATA_LOCK, 1, 10, UNIT_PERSON_DAY],
  ['SDTM作成', BASE_BEFORE_DATA_LOCK, 2, 1, UNIT_PERSON_MONTH],
  ['SDTM QC', BASE_BEFORE_DATA_LOCK, 2, 10, UNIT_PERSON_DAY],
  ['SDTMバリデーション', BASE_BEFORE_DATA_LOCK, 3, 3, UNIT_PERSON_DAY],
  ['ADaM仕様書作成', BASE_BEFORE_DATA_LOCK, 4, 10, UNIT_PERSON_DAY],
  ['ADaM作成', BASE_BEFORE_DATA_LOCK, 5, 1, UNIT_PERSON_MONTH],
  ['ADaM QC', BASE_BEFORE_DATA_LOCK, 5, 10, UNIT_PERSON_DAY],
  ['TLF作成', BASE_BEFORE_DATA_LOCK, 6, 1, UNIT_PERSON_MONTH],
  ['TLF QC', BASE_BEFORE_DATA_LOCK, 6, 10, UNIT_PERSON_DAY],
  ['症例検討会用資料作成', BASE_AFTER_LPO, 1, 10, UNIT_PERSON_DAY],
  ['ドライラン', BASE_AFTER_LPO, 2, 5, UNIT_PERSON_DAY],
  ['最終解析', BASE_AFTER_DATA_LOCK, 1, 5, UNIT_PERSON_DAY],
  ['統計解析報告書作成', BASE_AFTER_DATA_LOCK, 2, 1, UNIT_PERSON_MONTH],
];

// ---- スケジュールシート ----

export const SCHEDULE_HEADERS = [
  '略称',
  '作業',
  '回',
  '基準',
  '順番',
  '期間',
  '単位',
  '開始日',
  '完了日',
  '警告',
];

// 列（1始まり）。略称〜単位が入力、開始日〜警告は自動計算
export const SCHEDULE_TRIAL_COLUMN = 1;
export const SCHEDULE_TASK_COLUMN = 2;
export const SCHEDULE_ROUND_COLUMN = 3;
export const SCHEDULE_BASE_COLUMN = 4;
export const SCHEDULE_ORDER_COLUMN = 5;
export const SCHEDULE_PERIOD_COLUMN = 6;
export const SCHEDULE_UNIT_COLUMN = 7;
export const SCHEDULE_START_COLUMN = 8;
export const SCHEDULE_INPUT_WIDTH = 7;
export const SCHEDULE_OUTPUT_WIDTH = 3;

// データロック前に終わるべき作業（〇〇前の作業と LPO後の作業）がデータロック日以降にかかるときの警告
export const WARNING_OVER_DATA_LOCK = 'データロック日を超過';

// ---- イベント一覧・イベントシート ----

export const EVENT_MASTER_HEADERS = ['イベント'];

// LPO・データロックは試験一覧から取るため含めない
export const DEFAULT_EVENTS = [
  'FPI',
  '症例登録開始',
  '症例登録終了',
  'LPI',
  '中間解析データ固定',
  '効果安全性評価委員会',
  '追跡終了',
  '症例検討会',
];

export const EVENT_HEADERS = ['略称', 'イベント', '回', '日付'];

// 列（1始まり）
export const EVENT_TRIAL_COLUMN = 1;
export const EVENT_NAME_COLUMN = 2;
export const EVENT_ROUND_COLUMN = 3;
export const EVENT_DATE_COLUMN = 4;

// ---- タイムライン用データシート ----

export const TIMELINE_HEADERS = ['略称', '作業', '開始日', '終了日'];

// タイムライン用データの背景色。タイムライン表示の「カードの色」にこのシートの列を指定すると、バーの色になる
// 作業は白、イベント（LPO・データロックを含む）は淡い色
export const TASK_BACKGROUND = '#ffffff';
export const EVENT_BACKGROUND = '#fde2e4';

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
