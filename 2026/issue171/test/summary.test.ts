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
  buildPivot_,
  formatDate_,
  summarizeManagedSheet_,
} from '../src/summary';

const mockGetSheetByName = jest.fn();
const mockInsertSheet = jest.fn();
const mockSetValues = jest.fn();
const mockSetValue = jest.fn();
const mockClearContents = jest.fn();
const mockSetFrozenRows = jest.fn();
const mockSetFrozenColumns = jest.fn();
const mockAutoResizeColumns = jest.fn();
const mockSetColumnWidth = jest.fn();
const mockAutoResizeColumn = jest.fn();
const mockSetFontWeight = jest.fn();
const mockGetRange = jest.fn(() => ({
  setValues: mockSetValues,
  setValue: mockSetValue,
  setFontWeight: mockSetFontWeight,
}));

// 別スプレッドシート用モック
const mockTargetGetSheetByName = jest.fn();
const mockTargetInsertSheet = jest.fn();
const mockOpenById = jest.fn();
const mockGetProperty = jest.fn();

global.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheetByName: mockGetSheetByName,
    insertSheet: mockInsertSheet,
  }),
  openById: mockOpenById,
} as never;

global.PropertiesService = {
  getScriptProperties: () => ({ getProperty: mockGetProperty }),
} as never;

function makeSourceSheet(data: string[][]) {
  return {
    getDataRange: () => ({ getValues: () => data }),
  };
}

const mockSheetObj = () => ({
  getRange: mockGetRange,
  clearContents: mockClearContents,
  setFrozenRows: mockSetFrozenRows,
  setFrozenColumns: mockSetFrozenColumns,
  autoResizeColumns: mockAutoResizeColumns,
  setColumnWidth: mockSetColumnWidth,
  autoResizeColumn: mockAutoResizeColumn,
});

beforeEach(() => {
  jest.clearAllMocks();
  // デフォルト: SUMMARY_SPREADSHEET_ID 未設定
  mockGetProperty.mockReturnValue(null);
  mockInsertSheet.mockReturnValue(mockSheetObj());
  mockTargetInsertSheet.mockReturnValue(mockSheetObj());
  mockOpenById.mockReturnValue({
    getSheetByName: mockTargetGetSheetByName,
    insertSheet: mockTargetInsertSheet,
  });
});

// 管理対象一覧の行を生成するヘルパー（10列: パス〜ステータス）
function makeRow(
  path: string,
  collabName: string,
  permission: string,
  status = ''
): string[] {
  // A(0)=パス, B(1)=項目の種類, C(2)=コラボレータ名, D(3)=ログイン,
  // E(4)=種類, F(5)=権限, G(6)=招待日, H(7)=招待承認日, I(8)=有効期限, J(9)=ステータス
  return [path, '', collabName, '', '', permission, '', '', '', status];
}

describe('buildPivot_', () => {
  it('行ラベル・列ラベル・値を正しく配置する', () => {
    const body = [
      makeRow('path/A', 'Alice', 'editor'),
      makeRow('path/A', 'Bob', 'viewer'),
      makeRow('path/B', 'Alice', 'co-owner'),
    ];
    const result = buildPivot_(body);

    // ヘッダー行: B列固定 + 動的列
    expect(result[0]).toEqual(['', 'システム管理者', 'Alice', 'Bob']);
    // path/A 行: B列は「オーナー」固定
    expect(result[1]).toEqual(['path/A', 'オーナー', 'editor', 'viewer']);
    // path/B 行（Bob は空）
    expect(result[2]).toEqual(['path/B', 'オーナー', 'co-owner', '']);
  });

  it('同じキーが重複する場合は最初の値を使う', () => {
    const body = [
      makeRow('path/A', 'Alice', 'editor'),
      makeRow('path/A', 'Alice', 'viewer'), // 重複
    ];
    const result = buildPivot_(body);
    // B列はオーナー固定、C列（Alice）が editor
    expect(result[1][1]).toBe('オーナー');
    expect(result[1][2]).toBe('editor');
  });

  it('行・列ラベルは出現順を保持する', () => {
    const body = [
      makeRow('path/B', 'Charlie', 'viewer'),
      makeRow('path/A', 'Alice', 'editor'),
    ];
    const result = buildPivot_(body);
    expect(result[0]).toEqual(['', 'システム管理者', 'Charlie', 'Alice']);
    expect(result[1][0]).toBe('path/B');
    expect(result[2][0]).toBe('path/A');
  });
});

describe('summarizeManagedSheet_', () => {
  const header = [
    'パス',
    '項目の種類',
    'コラボレータ名',
    'ログイン',
    '種類',
    '権限',
    '招待日',
    '招待承認日',
    '有効期限',
    'ステータス',
  ];

  it('管理対象一覧シートが存在しない場合は何もしない', () => {
    mockGetSheetByName.mockReturnValue(null);
    summarizeManagedSheet_();
    expect(mockInsertSheet).not.toHaveBeenCalled();
  });

  it('A1セルにタイトルを太字で出力する', () => {
    const rows = [makeRow('path/A', 'Alice', 'editor')];
    mockGetSheetByName.mockImplementation((name: string) =>
      name === '管理対象一覧' ? makeSourceSheet([header, ...rows]) : null
    );

    summarizeManagedSheet_();

    // タイトルの setValue と setFontWeight('bold') が呼ばれる
    expect(mockSetValue).toHaveBeenCalledWith('グループアクセス権一覧（Box）');
    expect(mockSetFontWeight).toHaveBeenCalledWith('bold');
  });

  it('A2セルに実行日時を出力する', () => {
    const rows = [makeRow('path/A', 'Alice', 'editor')];
    mockGetSheetByName.mockImplementation((name: string) =>
      name === '管理対象一覧' ? makeSourceSheet([header, ...rows]) : null
    );

    summarizeManagedSheet_();

    // getRange(2, 1) への setValue で日時形式の文字列が渡される
    const dateCall = mockSetValue.mock.calls.find((c: string[]) =>
      /^\d{4}\/\d{2}\/\d{2} \d{2}:\d{2}:\d{2}$/.test(c[0])
    );
    expect(dateCall).toBeDefined();
    const rangeArg = mockGetRange.mock.calls.find(
      (c: number[]) => c[0] === 2 && c[1] === 1
    );
    expect(rangeArg).toBeDefined();
  });

  it('集計表は3行目から出力する', () => {
    const rows = [makeRow('path/A', 'Alice', 'editor')];
    mockGetSheetByName.mockImplementation((name: string) =>
      name === '管理対象一覧' ? makeSourceSheet([header, ...rows]) : null
    );

    summarizeManagedSheet_();

    // getRange(3, 1, ...) で setValues が呼ばれる
    const rangeArgs = mockGetRange.mock.calls.find(
      (c: number[]) => c[0] === 3 && c[1] === 1 && c.length === 4
    );
    expect(rangeArgs).toBeDefined();
  });

  it('削除済行を除外して集計する', () => {
    const rows = [
      makeRow('path/A', 'Alice', 'editor'),
      makeRow('path/A', 'Bob', 'viewer', '削除済（2026-05-28-15-39-18）'),
    ];
    mockGetSheetByName.mockImplementation((name: string) =>
      name === '管理対象一覧' ? makeSourceSheet([header, ...rows]) : null
    );

    summarizeManagedSheet_();

    const written = mockSetValues.mock.calls[0][0] as string[][];
    // Bob（削除済）は集計に含まれない。B列はシステム管理者固定
    expect(written[0]).toEqual(['', 'システム管理者', 'Alice']);
    expect(written[1]).toEqual(['path/A', 'オーナー', 'editor']);
  });

  it('集計シートが既存の場合はクリアして書き直す', () => {
    const rows = [makeRow('path/A', 'Alice', 'editor')];
    const existingSheet = mockSheetObj();
    mockGetSheetByName.mockImplementation((name: string) => {
      if (name === '管理対象一覧') return makeSourceSheet([header, ...rows]);
      if (name === 'Boxグループ') return existingSheet;
      return null;
    });

    summarizeManagedSheet_();

    expect(mockClearContents).toHaveBeenCalledTimes(1);
    expect(mockInsertSheet).not.toHaveBeenCalled();
  });
});

describe('summarizeManagedSheet_ (SUMMARY_SPREADSHEET_ID)', () => {
  const header = [
    'パス',
    '項目の種類',
    'コラボレータ名',
    'ログイン',
    '種類',
    '権限',
    '招待日',
    '招待承認日',
    '有効期限',
    'ステータス',
  ];

  it('SUMMARY_SPREADSHEET_ID が設定されている場合は openById で出力する', () => {
    mockGetProperty.mockReturnValue('target-ss-id');
    mockTargetGetSheetByName.mockReturnValue(null);
    const rows = [makeRow('path/A', 'Alice', 'editor')];
    mockGetSheetByName.mockImplementation((name: string) =>
      name === '管理対象一覧' ? makeSourceSheet([header, ...rows]) : null
    );

    summarizeManagedSheet_();

    expect(mockOpenById).toHaveBeenCalledWith('target-ss-id');
    expect(mockTargetInsertSheet).toHaveBeenCalledWith('Boxグループ');
    expect(mockInsertSheet).not.toHaveBeenCalled();
  });

  it('SUMMARY_SPREADSHEET_ID 未設定の場合はアクティブスプレッドシートに出力する', () => {
    mockGetProperty.mockReturnValue(null);
    const rows = [makeRow('path/A', 'Alice', 'editor')];
    mockGetSheetByName.mockImplementation((name: string) =>
      name === '管理対象一覧' ? makeSourceSheet([header, ...rows]) : null
    );

    summarizeManagedSheet_();

    expect(mockOpenById).not.toHaveBeenCalled();
    expect(mockInsertSheet).toHaveBeenCalledWith('Boxグループ');
  });
});

describe('formatDate_', () => {
  it('UTC+9（JST）に変換して YYYY/MM/DD HH:mm:ss 形式で返す', () => {
    // UTC 06:39:18 = JST 15:39:18
    const date = new Date(Date.UTC(2026, 4, 28, 6, 39, 18));
    expect(formatDate_(date)).toBe('2026/05/28 15:39:18');
  });

  it('1桁の月・日・時・分・秒をゼロ埋めする', () => {
    // UTC 00:03:07 = JST 09:03:07
    const date = new Date(Date.UTC(2026, 0, 5, 0, 3, 7));
    expect(formatDate_(date)).toBe('2026/01/05 09:03:07');
  });
});
