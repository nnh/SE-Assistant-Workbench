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
  TRIAL_INFO_SORT_KEYS,
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
