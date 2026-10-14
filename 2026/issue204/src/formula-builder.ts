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
// シートに書き込む数式を組み立てる（GAS API に依存しない）
import {
  CLOSED_STATUSES,
  DATACENTER_COLUMNS,
  DATACENTER_RANGE,
  RESEARCH_SYSTEM_RANGE,
  RESEARCH_SYSTEM_STATUS_COL,
  STAT_COLUMNS,
  SCHEDULE_UNDECIDED_SUFFIX,
  TIMELINE_MONTHS,
  TRIAL_END_COLUMN,
  TRIAL_INFO_SORT_KEYS,
  TRIAL_NAME_COLUMN,
  TRIAL_START_COLUMN,
  TRIAL_TIMELINE_START_COLUMN,
  TRIAL_VISIBILITY_COLUMN,
  VISIBILITY_HIDDEN,
} from './constants';

/**
 * 数式内の文字列リテラル用に、ダブルクォートをエスケープする。
 */
function escapeFormulaString_(value: string): string {
  return value.replace(/"/g, '""');
}

/**
 * 試験情報マスタの A1 に入れる数式を作る。1つの数式で次をまとめて行う。
 * 1. Stat シートから必要な列を取り込む
 *    - プロトコルIDが空の行と、終了系の状態（CLOSED_STATUSES）の試験は取り込まない
 *    - 状態が空欄の試験は取り込む（null との比較は偽になるため is null で明示的に残す）
 * 2. Datacenter シートの情報をプロトコルIDで left join する
 *    - 該当なしは空欄。同じプロトコルIDが複数ある場合は最初の行の値を使う
 * 3. TRIAL_INFO_SORT_KEYS の列で昇順に並べ、固定の見出し行を付ける（空欄は末尾に並ぶ）
 */
export function buildTrialInfoFormula_(url: string): string {
  const escapedUrl = escapeFormulaString_(url);

  const closed = CLOSED_STATUSES.map(
    status => `${RESEARCH_SYSTEM_STATUS_COL} = '${status}'`,
  ).join(' or ');
  const select = STAT_COLUMNS.map(([col]) => col).join(', ');
  const query =
    `select ${select} where Col1 is not null and ` +
    `(${RESEARCH_SYSTEM_STATUS_COL} is null or not (${closed}))`;

  const joinColumns = DATACENTER_COLUMNS.map(([column]) => column).join(',');

  // 見出しは研究管理システム側の見出しに左右されないよう固定の名前にする
  const headers = [
    ...STAT_COLUMNS.map(([, label]) => label),
    ...DATACENTER_COLUMNS.map(([, label]) => label),
  ];
  const headerLiteral = headers.map(label => `"${label}"`).join(',');
  const sortArgs = TRIAL_INFO_SORT_KEYS.map(
    key => `${headers.indexOf(key) + 1},TRUE`,
  ).join(',');

  return (
    '=LET(' +
    `stat,QUERY(IMPORTRANGE("${escapedUrl}","${RESEARCH_SYSTEM_RANGE}"),"${query}",0),` +
    'joined,ARRAYFORMULA(IFERROR(VLOOKUP(INDEX(stat,0,1),' +
    `IMPORTRANGE("${escapedUrl}","${DATACENTER_RANGE}"),{${joinColumns}},FALSE),"")),` +
    `VSTACK({${headerLiteral}},SORT(HSTACK(stat,joined),${sortArgs})))`
  );
}

/**
 * 列番号（1始まり）を列記号（A, B, ... Z）に変換する。26列以内のみ対応。
 */
function toColumnLetter_(column: number): string {
  return String.fromCharCode(64 + column);
}

/**
 * 試験一覧のタイムライン開始列（2行目）に入れる数式を作る。
 * - 試験名が空欄、または表示状態が「非表示」なら空欄（タイムラインに出さない）
 * - 開始日が入力済みなら開始日、空欄なら今日
 */
export function buildTimelineStartFormula_(): string {
  const name = toColumnLetter_(TRIAL_NAME_COLUMN);
  const visibility = toColumnLetter_(TRIAL_VISIBILITY_COLUMN);
  const start = toColumnLetter_(TRIAL_START_COLUMN);
  return (
    `=ARRAYFORMULA(IF((${name}2:${name}="")+` +
    `(${visibility}2:${visibility}="${VISIBILITY_HIDDEN}"),"",` +
    `IF(${start}2:${start}="",TODAY(),${start}2:${start})))`
  );
}

/**
 * 試験一覧のタイムライン終了列（2行目）に入れる数式を作る。
 * - タイムライン開始が空欄なら空欄
 * - 終了日が入力済みなら終了日
 * - 終了日が空欄で開始日が入力済みなら、開始日の TIMELINE_MONTHS か月後（カレンダー上）
 * - どちらも空欄ならタイムライン開始と同じ（今日）
 */
export function buildTimelineEndFormula_(): string {
  const timelineStart = toColumnLetter_(TRIAL_TIMELINE_START_COLUMN);
  const start = toColumnLetter_(TRIAL_START_COLUMN);
  const end = toColumnLetter_(TRIAL_END_COLUMN);
  return (
    `=ARRAYFORMULA(IF(${timelineStart}2:${timelineStart}="","",` +
    `IF(${end}2:${end}<>"",${end}2:${end},` +
    `IF(${start}2:${start}="",${timelineStart}2:${timelineStart},` +
    `EDATE(${start}2:${start},${TIMELINE_MONTHS})))))`
  );
}

/**
 * 試験一覧の表示名列（2行目）に入れる数式を作る（タイムラインのカードのタイトルに使う）。
 * 試験名に、開始日が空欄なら「（スケジュール未定）」を付ける。
 */
export function buildDisplayNameFormula_(): string {
  const name = toColumnLetter_(TRIAL_NAME_COLUMN);
  const start = toColumnLetter_(TRIAL_START_COLUMN);
  return (
    `=ARRAYFORMULA(IF(${name}2:${name}="","",` +
    `${name}2:${name}&IF(${start}2:${start}="","${SCHEDULE_UNDECIDED_SUFFIX}","")))`
  );
}

/**
 * 試験名があり、表示状態が「非表示」でなく、開始日が空欄のときに真になる条件付き書式の数式を作る（2行目基準）。
 */
export function buildMissingStartCondition_(): string {
  const name = toColumnLetter_(TRIAL_NAME_COLUMN);
  const visibility = toColumnLetter_(TRIAL_VISIBILITY_COLUMN);
  const start = toColumnLetter_(TRIAL_START_COLUMN);
  return `=AND($${name}2<>"",$${visibility}2<>"${VISIBILITY_HIDDEN}",$${start}2="")`;
}
