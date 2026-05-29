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
import { exportSheetAsPdf_, importCsvFiles_ } from '../src/import-csv';

const mockGetProperty = jest.fn();
const mockGetFiles = jest.fn();
const mockGetSheets = jest.fn();
const mockInsertSheet = jest.fn();
const mockSetValues = jest.fn();
const mockGetRange = jest.fn(() => ({ setValues: mockSetValues }));
const mockGetDataAsString = jest.fn();
const mockCreateFile = jest.fn();
const mockFetch = jest.fn();
const mockAutoResizeColumns = jest.fn();
const mockSetColumnWidth = jest.fn();
const mockAutoResizeColumn = jest.fn();
const mockInsertRowBefore = jest.fn();
const mockDeleteRow = jest.fn();
const mockSetValue = jest.fn();

global.PropertiesService = {
  getScriptProperties: () => ({ getProperty: mockGetProperty }),
} as never;

global.DriveApp = {
  getFolderById: () => ({
    getFiles: mockGetFiles,
    createFile: mockCreateFile,
  }),
} as never;

global.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getId: () => 'ss-id',
    getSheets: mockGetSheets,
    insertSheet: mockInsertSheet,
  }),
  flush: jest.fn(),
} as never;

global.Utilities = {
  parseCsv: (content: string) => content.split('\n').map(row => row.split(',')),
} as never;

global.UrlFetchApp = {
  fetch: mockFetch,
} as never;

global.ScriptApp = {
  getOAuthToken: () => 'mock-token',
} as never;

function makeFile(name: string, csvContent: string) {
  return {
    getName: () => name,
    getBlob: () => ({
      getDataAsString: mockGetDataAsString.mockReturnValue(csvContent),
    }),
  };
}

function makeIterator(files: ReturnType<typeof makeFile>[]) {
  let i = 0;
  return {
    hasNext: () => i < files.length,
    next: () => files[i++],
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockInsertSheet.mockReturnValue({
    getRange: mockGetRange,
    getSheetId: () => 12345,
    getName: () => '2026-05-28-15-39-18',
    getLastColumn: () => 10,
    autoResizeColumns: mockAutoResizeColumns,
    setColumnWidth: mockSetColumnWidth,
    autoResizeColumn: mockAutoResizeColumn,
  });
  mockFetch.mockReturnValue({
    getBlob: () => ({ setName: jest.fn().mockReturnValue({}) }),
  });
});

describe('importCsvFiles_', () => {
  it('FOLDER_ID 未設定のときエラーをスローする', () => {
    mockGetProperty.mockReturnValue(null);
    expect(() => importCsvFiles_()).toThrow('FOLDER_ID');
  });

  it('パターン外のファイルはスキップする', () => {
    mockGetProperty.mockImplementation((key: string) =>
      key === 'FOLDER_ID' ? 'folder-id' : null
    );
    mockGetSheets.mockReturnValue([]);
    mockGetFiles.mockReturnValue(makeIterator([makeFile('other.csv', 'a,b')]));

    importCsvFiles_();

    expect(mockInsertSheet).not.toHaveBeenCalled();
  });

  it('既存シートと同名のファイルはスキップする', () => {
    mockGetProperty.mockImplementation((key: string) =>
      key === 'FOLDER_ID' ? 'folder-id' : null
    );
    mockGetSheets.mockReturnValue([{ getName: () => '2026-05-28-15-39-18' }]);
    mockGetFiles.mockReturnValue(
      makeIterator([
        makeFile(
          'collaborations_run_on_2026-05-28-15-39-18_ページ_1.csv',
          'col1,col2\nval1,val2'
        ),
      ])
    );

    importCsvFiles_();

    expect(mockInsertSheet).not.toHaveBeenCalled();
  });

  it('新規ファイルをシートに書き込む', () => {
    mockGetProperty.mockImplementation((key: string) =>
      key === 'FOLDER_ID' ? 'folder-id' : null
    );
    mockGetSheets.mockReturnValue([]);
    mockGetFiles.mockReturnValue(
      makeIterator([
        makeFile(
          'collaborations_run_on_2026-05-28-15-39-18_ページ_1.csv',
          'col1,col2\nval1,val2'
        ),
      ])
    );

    importCsvFiles_();

    expect(mockInsertSheet).toHaveBeenCalledWith('2026-05-28-15-39-18');
    expect(mockSetValues).toHaveBeenCalled();
  });
});

describe('exportSheetAsPdf_', () => {
  const mockSs = { getId: () => 'ss-id' } as never;
  const mockSheet = {
    getSheetId: () => 99,
    getName: () => '2026-05-28-15-39-18',
    insertRowBefore: mockInsertRowBefore,
    deleteRow: mockDeleteRow,
    getRange: () => ({ setValue: mockSetValue }),
  } as never;

  it('fitw=true を URL に含める', () => {
    exportSheetAsPdf_(mockSs, mockSheet, 'pdf-folder-id');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://docs.google.com/spreadsheets/d/ss-id/export?format=pdf&gid=99&fitw=true&portrait=false',
      expect.objectContaining({
        headers: { Authorization: 'Bearer mock-token' },
      })
    );
  });

  it('シート名.pdf のファイル名で Drive に保存する', () => {
    exportSheetAsPdf_(mockSs, mockSheet, 'pdf-folder-id');

    expect(mockCreateFile).toHaveBeenCalled();
  });

  it('title が指定された場合は先頭行に挿入してPDF出力後に削除する', () => {
    exportSheetAsPdf_(mockSs, mockSheet, 'pdf-folder-id', 'test-title');

    expect(mockInsertRowBefore).toHaveBeenCalledWith(1);
    expect(mockSetValue).toHaveBeenCalledWith('test-title');
    expect(mockDeleteRow).toHaveBeenCalledWith(1);
  });

  it('title が未指定の場合は行の挿入・削除をしない', () => {
    exportSheetAsPdf_(mockSs, mockSheet, 'pdf-folder-id');

    expect(mockInsertRowBefore).not.toHaveBeenCalled();
    expect(mockDeleteRow).not.toHaveBeenCalled();
  });
});
