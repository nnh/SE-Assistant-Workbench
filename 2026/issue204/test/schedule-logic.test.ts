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
import {
  addBusinessDays_,
  buildBaseOptions_,
  buildTimelineRows_,
  EventRow,
  findHiddenRowRuns_,
  findMissingTaskRows_,
  parseBase_,
  scheduleTrialTasks_,
  TaskRow,
  TaskTemplate,
  toBusinessDays_,
  Trial,
} from '../src/schedule-logic';

// ローカル日付を作るヘルパー
const d = (y: number, m: number, day: number) => new Date(y, m - 1, day);

describe('addBusinessDays_', () => {
  it('土日を飛ばして進める・戻す', () => {
    // 2027/03/26 は金曜日
    expect(addBusinessDays_(d(2027, 3, 26), 1)).toEqual(d(2027, 3, 29));
    expect(addBusinessDays_(d(2027, 3, 29), -1)).toEqual(d(2027, 3, 26));
  });
  it('0 日なら同じ日付を返す', () => {
    expect(addBusinessDays_(d(2027, 3, 26), 0)).toEqual(d(2027, 3, 26));
  });
});

describe('toBusinessDays_', () => {
  it('1人日 = 1営業日、1人月 = 20営業日で換算し、端数は切り上げる', () => {
    expect(toBusinessDays_(3, '人日')).toBe(3);
    expect(toBusinessDays_(1.5, '人月')).toBe(30);
    expect(toBusinessDays_(2.2, '人日')).toBe(3);
  });
  it('期間が不正・単位が不明なら 0', () => {
    expect(toBusinessDays_(0, '人日')).toBe(0);
    expect(toBusinessDays_(NaN, '人日')).toBe(0);
    expect(toBusinessDays_(1, '時間')).toBe(0);
  });
});

describe('parseBase_ / buildBaseOptions_', () => {
  it('「〇〇前」「〇〇後」を基準日の名前と向きに分ける', () => {
    expect(parseBase_('症例検討会前')).toEqual({
      anchor: '症例検討会',
      before: true,
    });
    expect(parseBase_('LPO後')).toEqual({anchor: 'LPO', before: false});
    expect(parseBase_('前')).toBeNull();
    expect(parseBase_('LPO')).toBeNull();
  });
  it('LPO・データロック・イベントに「前」「後」を付けた選択肢を作る', () => {
    expect(buildBaseOptions_(['FPI'])).toEqual([
      'LPO前',
      'LPO後',
      'データロック前',
      'データロック後',
      'FPI前',
      'FPI後',
    ]);
  });
});

describe('scheduleTrialTasks_', () => {
  const row = (
    task: string,
    base: string,
    order: number,
    period: number,
    unit = '人日',
    round = '',
  ): TaskRow => ({trial: 'A', task, round, base, order, period, unit});
  // LPO: 2027/03/01(月)、データロック: 2027/03/31(水)
  const trial: Trial = {
    name: 'A',
    hidden: false,
    lpo: d(2027, 3, 1),
    dataLock: d(2027, 3, 31),
  };

  it('〇〇前の作業は、基準日の前営業日から逆算し、同じ順番は完了日を揃える', () => {
    const rows = [
      row('仕様書', 'データロック前', 1, 2),
      row('作成', 'データロック前', 2, 5),
      row('QC', 'データロック前', 2, 3),
    ];
    expect(scheduleTrialTasks_(trial, rows, [])).toEqual([
      {start: d(2027, 3, 22), end: d(2027, 3, 23), warning: ''},
      {start: d(2027, 3, 24), end: d(2027, 3, 30), warning: ''},
      {start: d(2027, 3, 26), end: d(2027, 3, 30), warning: ''},
    ]);
  });

  it('〇〇後の作業は、基準日の翌営業日から前向きに詰める', () => {
    const rows = [
      row('最終解析', 'データロック後', 1, 2),
      row('報告書', 'データロック後', 2, 1),
    ];
    expect(scheduleTrialTasks_(trial, rows, [])).toEqual([
      {start: d(2027, 4, 1), end: d(2027, 4, 2), warning: ''},
      {start: d(2027, 4, 5), end: d(2027, 4, 5), warning: ''},
    ]);
  });

  it('LPO後の作業がデータロック日以降にかかれば警告する', () => {
    const rows = [
      row('資料作成', 'LPO後', 1, 1, '人月'),
      row('ドライラン', 'LPO後', 2, 5),
    ];
    expect(scheduleTrialTasks_(trial, rows, [])).toEqual([
      {start: d(2027, 3, 2), end: d(2027, 3, 29), warning: ''},
      {
        start: d(2027, 3, 30),
        end: d(2027, 4, 5),
        warning: 'データロック日を超過',
      },
    ]);
  });

  it('イベントを基準にでき、同じ回のイベントの日付を使う。〇〇前の作業がデータロックを超えれば警告する', () => {
    const events: EventRow[] = [
      {trial: 'A', name: '症例検討会', round: '', date: d(2027, 4, 7)},
      {
        trial: 'A',
        name: '中間解析データ固定',
        round: '1',
        date: d(2026, 10, 1),
      },
      {trial: 'A', name: '中間解析データ固定', round: '2', date: d(2027, 1, 4)},
      {trial: 'B', name: '症例検討会', round: '', date: d(2027, 1, 4)},
    ];
    const rows = [
      row('資料作成', '症例検討会前', 1, 2),
      row('中間解析', '中間解析データ固定後', 1, 1, '人日', '2'),
    ];
    // 2027/04/07 は水曜日 → 前営業日 04/06 から2日逆算。2027/01/04 は月曜日 → 翌営業日 01/05
    expect(scheduleTrialTasks_(trial, rows, events)).toEqual([
      {
        start: d(2027, 4, 5),
        end: d(2027, 4, 6),
        warning: 'データロック日を超過',
      },
      {start: d(2027, 1, 5), end: d(2027, 1, 5), warning: ''},
    ]);
  });

  it('基準が不正・基準日が未入力・期間が不正な作業は日付なし', () => {
    const noLpo: Trial = {...trial, lpo: null};
    const rows = [
      row('不正', 'その他', 1, 1),
      row('期間なし', 'データロック前', 1, 0),
      row('LPOなし', 'LPO後', 1, 1),
      row('イベントなし', '症例検討会前', 1, 1),
    ];
    expect(scheduleTrialTasks_(noLpo, rows, [])).toEqual(
      rows.map(() => ({start: null, end: null, warning: ''})),
    );
  });
});

describe('findMissingTaskRows_', () => {
  const templates: TaskTemplate[] = [
    {task: '作成', base: 'データロック前', order: 1, period: 1, unit: '人月'},
    {task: 'QC', base: 'データロック前', order: 1, period: 10, unit: '人日'},
  ];
  const trial = (name: string, lpo: Date | null, dataLock: Date | null) => ({
    name,
    hidden: false,
    lpo,
    dataLock,
  });

  it('LPO・データロックが両方ある試験に、足りない作業だけをテンプレートの値で追加する', () => {
    const trials = [
      trial('A', d(2027, 3, 1), d(2027, 3, 31)),
      trial('B', d(2027, 3, 1), null),
    ];
    const existing: TaskRow[] = [
      {
        trial: 'A',
        task: '作成',
        round: '',
        base: '症例検討会前',
        order: 3,
        period: 2,
        unit: '人月',
      },
    ];
    expect(findMissingTaskRows_(trials, existing, templates)).toEqual([
      {
        trial: 'A',
        task: 'QC',
        round: '',
        base: 'データロック前',
        order: 1,
        period: 10,
        unit: '人日',
      },
    ]);
  });
});

describe('buildTimelineRows_', () => {
  it('LPO・データロック・作業・イベントをまとめ、試験一覧の順 → 開始日順に並べる（非表示は除く）。イベントかどうかも返す', () => {
    const trials: Trial[] = [
      {name: 'B', hidden: false, lpo: null, dataLock: d(2027, 6, 30)},
      {name: 'A', hidden: false, lpo: d(2027, 3, 1), dataLock: null},
      {name: 'C', hidden: true, lpo: d(2027, 3, 1), dataLock: null},
    ];
    const taskRow = (task: string, round = ''): TaskRow => ({
      trial: 'A',
      task,
      round,
      base: 'LPO後',
      order: 1,
      period: 1,
      unit: '人日',
    });
    const tasks = [
      {
        row: taskRow('資料作成', '2'),
        dates: {start: d(2027, 3, 2), end: d(2027, 3, 29), warning: ''},
      },
      {
        row: taskRow('未計算'),
        dates: {start: null, end: null, warning: ''},
      },
    ];
    const events: EventRow[] = [
      {
        trial: 'A',
        name: '中間解析データ固定',
        round: '2',
        date: d(2026, 10, 1),
      },
      {trial: 'C', name: 'FPI', round: '', date: d(2026, 1, 1)},
      {trial: 'B', name: '症例検討会', round: '', date: null},
    ];
    expect(buildTimelineRows_(trials, tasks, events)).toEqual([
      {
        row: ['B', 'データロック', d(2027, 6, 30), d(2027, 6, 30)],
        isEvent: true,
      },
      {
        row: ['A', '中間解析データ固定(第2回)', d(2026, 10, 1), d(2026, 10, 1)],
        isEvent: true,
      },
      {row: ['A', 'LPO', d(2027, 3, 1), d(2027, 3, 1)], isEvent: true},
      {
        row: ['A', '資料作成(第2回)', d(2027, 3, 2), d(2027, 3, 29)],
        isEvent: false,
      },
    ]);
  });
});

describe('findHiddenRowRuns_', () => {
  it('非表示の試験の行を連続範囲ごとにまとめる', () => {
    const trials = ['A', 'B', 'B', 'A', 'C', 'B', ''];
    expect(findHiddenRowRuns_(trials, new Set(['B', 'C']))).toEqual([
      [1, 2],
      [4, 2],
    ]);
  });
  it('非表示の試験がなければ空配列を返す', () => {
    expect(findHiddenRowRuns_(['A', 'B'], new Set())).toEqual([]);
  });
});
