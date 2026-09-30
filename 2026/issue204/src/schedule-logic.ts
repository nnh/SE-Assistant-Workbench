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
// GAS API に依存しないスケジュール計算ロジック
// ※ GAS では関数名末尾が "_" の関数はプライベート扱いになるため、公開不要な関数には "_" を付けている
import {
  BASE_AFTER_LPO,
  BASE_SUFFIX_AFTER,
  BASE_SUFFIX_BEFORE,
  BUSINESS_DAYS_PER_UNIT,
  DATA_LOCK_LABEL,
  LPO_LABEL,
  WARNING_OVER_DATA_LOCK,
} from './constants';

// 試験一覧の1試験分
export type Trial = {
  name: string;
  hidden: boolean;
  lpo: Date | null;
  dataLock: Date | null;
};

// 作業テンプレートの1作業分
export type TaskTemplate = {
  task: string;
  base: string;
  order: number;
  period: number;
  unit: string;
};

// スケジュールシートの1行（入力部分）
export type TaskRow = {
  trial: string;
  task: string;
  round: string;
  base: string;
  order: number;
  period: number;
  unit: string;
};

// スケジュールシートの1行の計算結果
export type TaskDates = {
  start: Date | null;
  end: Date | null;
  warning: string;
};

// イベントシートの1行
export type EventRow = {
  trial: string;
  name: string;
  round: string;
  date: Date | null;
};

// タイムライン用データの1行（略称, 作業, 開始日, 終了日）
export type TimelineRow = [string, string, Date, Date];

// タイムライン用データの1行と、イベント（LPO・データロックを含む）かどうか
export type TimelineEntry = {row: TimelineRow; isEvent: boolean};

/**
 * 値が有効な Date かどうかを判定する。
 */
export function isDate_(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * 時刻を切り捨てて日付だけにする（ローカルタイムゾーンの0時）。
 */
export function toDateOnly_(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/**
 * 営業日（土日以外）かどうかを判定する。祝日は考慮しない。
 */
export function isBusinessDay_(date: Date): boolean {
  const day = date.getDay();
  return day !== 0 && day !== 6;
}

/**
 * 営業日を n 日進めた（n が負なら戻した）日付を返す。n = 0 なら同じ日付を返す。
 */
export function addBusinessDays_(date: Date, n: number): Date {
  let current = toDateOnly_(date);
  const step = n < 0 ? -1 : 1;
  let remaining = Math.abs(n);
  while (remaining > 0) {
    current = new Date(
      current.getFullYear(),
      current.getMonth(),
      current.getDate() + step,
    );
    if (isBusinessDay_(current)) {
      remaining--;
    }
  }
  return current;
}

/**
 * 期間（人日・人月）を営業日数に換算する。端数は切り上げ。
 * 期間が正の数でない、または単位が不明なら 0 を返す（日付を計算しない）。
 */
export function toBusinessDays_(period: number, unit: string): number {
  const perUnit = BUSINESS_DAYS_PER_UNIT[unit];
  if (!perUnit || !(period > 0)) {
    return 0;
  }
  return Math.ceil(period * perUnit);
}

/**
 * 基準の選択肢を作る（LPO・データロック・イベントのそれぞれに「前」「後」を付ける）。
 */
export function buildBaseOptions_(eventNames: string[]): string[] {
  return [LPO_LABEL, DATA_LOCK_LABEL, ...eventNames].flatMap(anchor => [
    `${anchor}${BASE_SUFFIX_BEFORE}`,
    `${anchor}${BASE_SUFFIX_AFTER}`,
  ]);
}

/**
 * 基準（「〇〇前」「〇〇後」）を基準日の名前と向きに分ける。形式が違えば null。
 */
export function parseBase_(
  base: string,
): {anchor: string; before: boolean} | null {
  if (base.length < 2) {
    return null;
  }
  const suffix = base.slice(-1);
  if (suffix !== BASE_SUFFIX_BEFORE && suffix !== BASE_SUFFIX_AFTER) {
    return null;
  }
  return {anchor: base.slice(0, -1), before: suffix === BASE_SUFFIX_BEFORE};
}

/**
 * 基準日を求める。LPO・データロックは試験一覧から、それ以外はイベントシートの同じ試験・同じ回の日付を使う。
 */
export function resolveAnchorDate_(
  trial: Trial,
  events: EventRow[],
  anchor: string,
  round: string,
): Date | null {
  if (anchor === LPO_LABEL) {
    return trial.lpo;
  }
  if (anchor === DATA_LOCK_LABEL) {
    return trial.dataLock;
  }
  const event = events.find(
    e =>
      e.trial === trial.name &&
      e.name === anchor &&
      e.round === round &&
      e.date,
  );
  return event?.date ?? null;
}

/**
 * 1試験分の作業の開始日・完了日を計算する（rows と同じ並びで返す）。
 * - 同じ基準・同じ回の作業を1つの流れとして、順番に沿って詰める（同じ順番は並行して進める）
 * - 基準の形式が不正、基準日が未入力、期間が不正な作業は日付なし
 * - データロック前に終わるべき作業（〇〇前の作業と LPO後の作業）がデータロック日以降にかかれば警告する
 */
export function scheduleTrialTasks_(
  trial: Trial,
  rows: TaskRow[],
  events: EventRow[],
): TaskDates[] {
  const results: TaskDates[] = rows.map(() => ({
    start: null,
    end: null,
    warning: '',
  }));
  const days = (index: number) =>
    toBusinessDays_(rows[index].period, rows[index].unit);

  // 基準・回ごとに、順番 → 行インデックスの一覧 にまとめる
  const flows = new Map<
    string,
    {base: string; round: string; groups: Map<number, number[]>}
  >();
  rows.forEach((row, index) => {
    if (!parseBase_(row.base) || days(index) === 0) {
      return;
    }
    const key = `${row.base}\u0000${row.round}`;
    const flow = flows.get(key) ?? {
      base: row.base,
      round: row.round,
      groups: new Map<number, number[]>(),
    };
    flow.groups.set(row.order, [...(flow.groups.get(row.order) ?? []), index]);
    flows.set(key, flow);
  });

  flows.forEach(({base, round, groups}) => {
    const {anchor, before} = parseBase_(base)!;
    const anchorDate = resolveAnchorDate_(trial, events, anchor, round);
    if (!anchorDate) {
      return;
    }
    if (before) {
      // 基準日の前営業日から、順番の降順に逆算して詰める（同じ順番は完了日を揃える）
      let cursor = addBusinessDays_(anchorDate, -1);
      [...groups.keys()]
        .sort((a, b) => b - a)
        .forEach(order => {
          let groupStart = cursor;
          groups.get(order)!.forEach(index => {
            const start = addBusinessDays_(cursor, -(days(index) - 1));
            results[index].start = start;
            results[index].end = cursor;
            if (start < groupStart) {
              groupStart = start;
            }
          });
          cursor = addBusinessDays_(groupStart, -1);
        });
    } else {
      // 基準日の翌営業日から、順番の昇順に前向きに詰める（同じ順番は開始日を揃える）
      let cursor = addBusinessDays_(anchorDate, 1);
      [...groups.keys()]
        .sort((a, b) => a - b)
        .forEach(order => {
          let groupEnd = cursor;
          groups.get(order)!.forEach(index => {
            const end = addBusinessDays_(cursor, days(index) - 1);
            results[index].start = cursor;
            results[index].end = end;
            if (end > groupEnd) {
              groupEnd = end;
            }
          });
          cursor = addBusinessDays_(groupEnd, 1);
        });
    }
  });

  // データロック前に終わるべき作業がデータロック日以降にかかっていれば警告する
  if (trial.dataLock) {
    const lock = toDateOnly_(trial.dataLock);
    rows.forEach((row, index) => {
      const mustEndBeforeLock =
        row.base.endsWith(BASE_SUFFIX_BEFORE) || row.base === BASE_AFTER_LPO;
      const end = results[index].end;
      if (mustEndBeforeLock && end && end >= lock) {
        results[index].warning = WARNING_OVER_DATA_LOCK;
      }
    });
  }

  return results;
}

/**
 * LPO とデータロックが両方入力された試験について、スケジュールシートに足りない作業の行を返す。
 * 既にある行（同じ略称・作業、回は空欄）は追加しない。基準・順番・期間・単位は作業テンプレートの値を使う。
 */
export function findMissingTaskRows_(
  trials: Trial[],
  existing: TaskRow[],
  templates: TaskTemplate[],
): TaskRow[] {
  const existingKeys = new Set(
    existing
      .filter(row => row.round === '')
      .map(row => `${row.trial}\u0000${row.task}`),
  );
  const missing: TaskRow[] = [];
  trials
    .filter(trial => trial.name !== '' && trial.lpo && trial.dataLock)
    .forEach(trial => {
      templates.forEach(template => {
        if (!existingKeys.has(`${trial.name}\u0000${template.task}`)) {
          missing.push({
            trial: trial.name,
            task: template.task,
            round: '',
            base: template.base,
            order: template.order,
            period: template.period,
            unit: template.unit,
          });
        }
      });
    });
  return missing;
}

/**
 * 回があれば「(第n回)」を付けた表示名を返す。
 */
function withRound_(name: string, round: string): string {
  return round !== '' ? `${name}(第${round}回)` : name;
}

/**
 * タイムライン表示用のデータを作る。
 * - 作業: 開始日〜完了日のバー（日付が計算できたものだけ）
 * - イベント・LPO・データロック: 1日だけのバー
 * - 回があれば「(第n回)」を付ける
 * - 非表示の試験・試験一覧にない試験は出さない
 * 並び順は試験一覧の順、同じ試験内では開始日順。
 * 背景色を塗り分けられるよう、イベントかどうかも返す。
 */
export function buildTimelineRows_(
  trials: Trial[],
  tasks: {row: TaskRow; dates: TaskDates}[],
  events: EventRow[],
): TimelineEntry[] {
  const visible = trials.filter(trial => !trial.hidden);
  const order = new Map<string, number>();
  visible.forEach((trial, index) => order.set(trial.name, index));

  const entries: TimelineEntry[] = [];
  const pushEvent = (trial: string, name: string, date: Date) => {
    const day = toDateOnly_(date);
    entries.push({row: [trial, name, day, day], isEvent: true});
  };
  visible.forEach(trial => {
    if (trial.lpo) {
      pushEvent(trial.name, LPO_LABEL, trial.lpo);
    }
    if (trial.dataLock) {
      pushEvent(trial.name, DATA_LOCK_LABEL, trial.dataLock);
    }
  });
  tasks.forEach(({row, dates}) => {
    if (order.has(row.trial) && dates.start && dates.end) {
      entries.push({
        row: [
          row.trial,
          withRound_(row.task, row.round),
          dates.start,
          dates.end,
        ],
        isEvent: false,
      });
    }
  });
  events.forEach(event => {
    if (order.has(event.trial) && event.date) {
      pushEvent(event.trial, withRound_(event.name, event.round), event.date);
    }
  });

  return entries.sort(
    (a, b) =>
      order.get(a.row[0])! - order.get(b.row[0])! ||
      a.row[2].getTime() - b.row[2].getTime(),
  );
}

/**
 * 非表示にする行の連続範囲を求める（行の非表示操作をまとめて行うため）。
 * 戻り値は [先頭のインデックス(0始まり), 行数] の配列。
 */
export function findHiddenRowRuns_(
  trials: string[],
  hiddenTrials: Set<string>,
): [number, number][] {
  const runs: [number, number][] = [];
  trials.forEach((trial, index) => {
    if (!hiddenTrials.has(trial)) {
      return;
    }
    const last = runs[runs.length - 1];
    if (last && last[0] + last[1] === index) {
      last[1]++;
    } else {
      runs.push([index, 1]);
    }
  });
  return runs;
}
