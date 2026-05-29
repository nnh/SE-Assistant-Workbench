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
  distributeByCategory_,
  findDeletedRows_,
  resizeColumns_,
  sortByFolderPath_,
  transformRows_,
} from '../src/distribute';

const mockGetSheets = jest.fn();
const mockGetSheetByName = jest.fn();
const mockInsertSheet = jest.fn();
const mockSetValues = jest.fn();
const mockClearContents = jest.fn();
const mockAutoResizeColumns = jest.fn();
const mockSetColumnWidth = jest.fn();
const mockAutoResizeColumn = jest.fn();
const mockGetRange = jest.fn(() => ({ setValues: mockSetValues }));
const mockSetFrozenRows = jest.fn();
const mockGetDataRange = jest.fn();

global.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheets: mockGetSheets,
    getSheetByName: mockGetSheetByName,
    insertSheet: mockInsertSheet,
  }),
} as never;

function makeSheet(name: string, data: string[][]) {
  return {
    getName: () => name,
    getDataRange: () => ({ getValues: () => data }),
    clearContents: mockClearContents,
    getRange: mockGetRange,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  const mockSheet = {
    getRange: mockGetRange,
    clearContents: mockClearContents,
    autoResizeColumns: mockAutoResizeColumns,
    setColumnWidth: mockSetColumnWidth,
    autoResizeColumn: mockAutoResizeColumn,
    setFrozenRows: mockSetFrozenRows,
  };
  mockInsertSheet.mockReturnValue(mockSheet);
  mockGetSheetByName.mockReturnValue(null);
});

describe('distributeByCategory_', () => {
  it('日時シートが存在しない場合は何もしない', () => {
    mockGetSheets.mockReturnValue([makeSheet('Sheet1', [])]);

    distributeByCategory_();

    expect(mockInsertSheet).not.toHaveBeenCalled();
  });

  it('最新の日時シートを使用する', () => {
    // C列（除外対象外）に識別値を置く
    const older = makeSheet('2026-05-27-10-00-00', [['', '', 'old_c']]);
    const newer = makeSheet('2026-05-28-15-39-18', [['', '', 'new_c']]);
    mockGetSheets.mockReturnValue([older, newer]);

    distributeByCategory_();

    // 最新シートのC列値が setValues に渡される
    const allValues = mockSetValues.mock.calls.flatMap((c: string[][][]) =>
      c[0].flat()
    );
    expect(allValues).toContain('new_c');
    expect(allValues).not.toContain('old_c');
  });

  it('J列が「管理対象」の行を「管理対象」シートに出力する', () => {
    const header = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    const row1 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', '管理対象'];
    const row2 = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', '外部'];
    mockGetSheets.mockReturnValue([
      makeSheet('2026-05-28-15-39-18', [header, row1, row2]),
    ]);

    distributeByCategory_();

    expect(mockInsertSheet).toHaveBeenCalledWith('管理対象一覧');
    const kanriCall = mockSetValues.mock.calls.find((c: string[][][]) =>
      c[0].some((r: string[]) => r.includes('管理対象'))
    );
    // A, B, D, E, F 列が除外され、末尾にステータス列が付いた出力を期待する
    expect(kanriCall[0]).toEqual([
      ['C', 'G', 'H', 'I', 'J', 'ステータス'],
      ['c', 'g', 'h', 'i', '管理対象', ''],
    ]);
  });

  it('対象シートが既存の場合はクリアしてから出力する', () => {
    const header = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    mockGetSheets.mockReturnValue([makeSheet('2026-05-28-15-39-18', [header])]);
    const existingSheet = {
      getRange: mockGetRange,
      clearContents: mockClearContents,
      autoResizeColumns: mockAutoResizeColumns,
      setColumnWidth: mockSetColumnWidth,
      autoResizeColumn: mockAutoResizeColumn,
      setFrozenRows: mockSetFrozenRows,
      getDataRange: () => ({ getValues: () => [] }),
    };
    mockGetSheetByName.mockReturnValue(existingSheet);

    distributeByCategory_();

    expect(mockClearContents).toHaveBeenCalledTimes(2); // 管理対象・外部 の両シート
    expect(mockInsertSheet).not.toHaveBeenCalled();
  });

  it('出力後に列幅を調整する', () => {
    const header = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    mockGetSheets.mockReturnValue([makeSheet('2026-05-28-15-39-18', [header])]);

    distributeByCategory_();

    // 管理対象・外部 の両シートで列幅調整が呼ばれる（setColumnWidth または autoResizeColumn）
    const totalCalls =
      mockSetColumnWidth.mock.calls.length +
      mockAutoResizeColumn.mock.calls.length +
      mockAutoResizeColumns.mock.calls.length;
    expect(totalCalls).toBeGreaterThan(0);
  });
});

describe('sortByFolderPath_', () => {
  // D列（インデックス3）の値でソートされることを確認するヘルパー
  function makeRow(dValue: string): string[] {
    return ['', '', '', dValue, '', '', '', '', '', ''];
  }

  it('フォルダパスの先頭コンポーネントでソートする', () => {
    const rows = [makeRow('0/BBB/'), makeRow('0/AAA/'), makeRow('0/CCC/')];
    const result = sortByFolderPath_(rows);
    expect(result.map(r => r[3])).toEqual(['0/AAA/', '0/BBB/', '0/CCC/']);
  });

  it('親フォルダが同じ場合は子コンポーネントでソートする', () => {
    const rows = [
      makeRow('0/111/222/'),
      makeRow('0/111/000/'),
      makeRow('0/111/111/'),
    ];
    const result = sortByFolderPath_(rows);
    expect(result.map(r => r[3])).toEqual([
      '0/111/000/',
      '0/111/111/',
      '0/111/222/',
    ]);
  });

  it('階層が浅い方が先になる', () => {
    const rows = [makeRow('0/111/222/'), makeRow('0/111/')];
    const result = sortByFolderPath_(rows);
    expect(result.map(r => r[3])).toEqual(['0/111/', '0/111/222/']);
  });

  it('元の配列を変更しない', () => {
    const rows = [makeRow('0/BBB/'), makeRow('0/AAA/')];
    const original = [...rows];
    sortByFolderPath_(rows);
    expect(rows).toEqual(original);
  });
});

describe('transformRows_', () => {
  // A B C D E F G H I J K L M ...
  // 0 1 2 3 4 5 6 7 8 9 10 11 12
  function makeFullRow(c: string): string[] {
    return ['A', 'B', c, 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'];
  }

  it('A, B, D, E, F, L列を除外する', () => {
    const result = transformRows_([makeFullRow('C_val')]);
    // 残る列: C(2), G(6), H(7), I(8), J(9), K(10), M(12)
    expect(result[0]).toEqual(['C_val', 'G', 'H', 'I', 'J', 'K', 'M']);
  });

  it('C列先頭の「すべてのファイル/」を削除する', () => {
    const result = transformRows_([makeFullRow('すべてのファイル/foo/bar')]);
    expect(result[0][0]).toBe('foo/bar');
  });

  it('C列が「すべてのファイル/」で始まらない場合はそのまま', () => {
    const result = transformRows_([makeFullRow('other/path')]);
    expect(result[0][0]).toBe('other/path');
  });
});

describe('resizeColumns_', () => {
  const mockSetColumnWidth = jest.fn();
  const mockAutoResizeColumn = jest.fn();
  const mockAutoResizeColumns = jest.fn();
  const sheet = {
    setColumnWidth: mockSetColumnWidth,
    autoResizeColumn: mockAutoResizeColumn,
    autoResizeColumns: mockAutoResizeColumns,
  } as never;

  beforeEach(() => jest.clearAllMocks());

  it('widths が空の場合は autoResizeColumns を呼ぶ', () => {
    resizeColumns_(sheet, 5, []);
    expect(mockAutoResizeColumns).toHaveBeenCalledWith(1, 5);
    expect(mockSetColumnWidth).not.toHaveBeenCalled();
    expect(mockAutoResizeColumn).not.toHaveBeenCalled();
  });

  it('width > 0 の列は setColumnWidth を呼ぶ', () => {
    resizeColumns_(sheet, 3, [100, 200, 150]);
    expect(mockSetColumnWidth).toHaveBeenCalledWith(1, 100);
    expect(mockSetColumnWidth).toHaveBeenCalledWith(2, 200);
    expect(mockSetColumnWidth).toHaveBeenCalledWith(3, 150);
    expect(mockAutoResizeColumn).not.toHaveBeenCalled();
  });

  it('width が 0 の列は autoResizeColumn を呼ぶ', () => {
    resizeColumns_(sheet, 3, [100, 0, 150]);
    expect(mockSetColumnWidth).toHaveBeenCalledWith(1, 100);
    expect(mockAutoResizeColumn).toHaveBeenCalledWith(2);
    expect(mockSetColumnWidth).toHaveBeenCalledWith(3, 150);
  });

  it('widths が colCount より短い場合、余った列は autoResizeColumn を呼ぶ', () => {
    resizeColumns_(sheet, 4, [100]);
    expect(mockSetColumnWidth).toHaveBeenCalledWith(1, 100);
    expect(mockAutoResizeColumn).toHaveBeenCalledWith(2);
    expect(mockAutoResizeColumn).toHaveBeenCalledWith(3);
    expect(mockAutoResizeColumn).toHaveBeenCalledWith(4);
  });
});

describe('findDeletedRows_', () => {
  const DATA_COLS = 9;
  const header = Array<string>(DATA_COLS).fill('H');

  // パス(0), コラボレータのログイン(3), コラボレータ権限(5) にキー値を持つ行を生成
  function makeRow(path: string, login: string, perm: string): string[] {
    const row = Array<string>(DATA_COLS).fill('');
    row[0] = path;
    row[3] = login;
    row[5] = perm;
    return row;
  }

  const LABEL = '削除済（2026-05-28-15-39-18）';

  it('既存データが空またはヘッダーのみの場合は空配列を返す', () => {
    expect(findDeletedRows_([], [], DATA_COLS, LABEL)).toEqual([]);
    expect(findDeletedRows_([header], [], DATA_COLS, LABEL)).toEqual([]);
  });

  it('全ての既存行が新データに存在する場合は空配列を返す', () => {
    const row = makeRow('path1', 'login1', 'editor');
    expect(findDeletedRows_([header, row], [row], DATA_COLS, LABEL)).toEqual(
      []
    );
  });

  it('新データに存在しない行を statusLabel 付きで返す', () => {
    const row = makeRow('path1', 'login1', 'editor');
    const result = findDeletedRows_([header, row], [], DATA_COLS, LABEL);
    expect(result).toHaveLength(1);
    expect(result[0][DATA_COLS]).toBe(LABEL);
    expect(result[0].slice(0, DATA_COLS)).toEqual(row);
  });

  it('既に「削除済」で始まる行は比較対象外にする', () => {
    const row = makeRow('path1', 'login1', 'editor');
    const deletedRow = [...row, '削除済（2026-05-27-10-00-00）'];
    const existing = [[...header, 'ステータス'], deletedRow];
    expect(findDeletedRows_(existing, [], DATA_COLS, LABEL)).toEqual([]);
  });

  it('ステータス列がない既存データは全行をアクティブとして扱う', () => {
    const row = makeRow('path1', 'login1', 'editor');
    const result = findDeletedRows_([header, row], [], DATA_COLS, LABEL);
    expect(result).toHaveLength(1);
  });

  it('キーが一致すれば削除済にならない', () => {
    const old = makeRow('path1', 'login1', 'editor');
    const newRow = makeRow('path1', 'login1', 'editor');
    newRow[1] = 'changed';
    expect(findDeletedRows_([header, old], [newRow], DATA_COLS, LABEL)).toEqual(
      []
    );
  });
});
