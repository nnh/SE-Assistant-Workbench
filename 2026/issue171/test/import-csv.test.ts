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
import { importCsvFiles_ } from '../src/import-csv';

const mockGetProperty = jest.fn();
const mockGetFiles = jest.fn();
const mockGetSheets = jest.fn();
const mockInsertSheet = jest.fn();
const mockSetValues = jest.fn();
const mockGetRange = jest.fn(() => ({ setValues: mockSetValues }));
const mockGetDataAsString = jest.fn();

global.PropertiesService = {
  getScriptProperties: () => ({ getProperty: mockGetProperty }),
} as never;

global.DriveApp = {
  getFolderById: () => ({ getFiles: mockGetFiles }),
} as never;

global.SpreadsheetApp = {
  getActiveSpreadsheet: () => ({
    getSheets: mockGetSheets,
    insertSheet: mockInsertSheet,
  }),
} as never;

global.Utilities = {
  parseCsv: (content: string) => content.split('\n').map(row => row.split(',')),
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
  mockInsertSheet.mockReturnValue({ getRange: mockGetRange });
});

describe('importCsvFiles_', () => {
  it('FOLDER_ID 未設定のときエラーをスローする', () => {
    mockGetProperty.mockReturnValue(null);
    expect(() => importCsvFiles_()).toThrow('FOLDER_ID');
  });

  it('パターン外のファイルはスキップする', () => {
    mockGetProperty.mockReturnValue('folder-id');
    mockGetSheets.mockReturnValue([]);
    mockGetFiles.mockReturnValue(makeIterator([makeFile('other.csv', 'a,b')]));

    importCsvFiles_();

    expect(mockInsertSheet).not.toHaveBeenCalled();
  });

  it('既存シートと同名のファイルはスキップする', () => {
    mockGetProperty.mockReturnValue('folder-id');
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
    mockGetProperty.mockReturnValue('folder-id');
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
