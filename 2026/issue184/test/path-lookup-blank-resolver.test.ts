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
import {fillBlankPaths_} from '../src/path-lookup-blank-resolver';

jest.mock('../src/file-path-resolver', () => ({
  getFilePath_: (fileId: string) => `/resolved/${fileId}`,
}));

describe('fillBlankPaths_', () => {
  it('パスが空白の行だけDriveAppでパスを取得し、1件ずつ書き込む', () => {
    const header = ['パス', 'ID', 'ファイル名', 'URL'];
    const values = [
      header,
      ['/already/set', 'id-1', 'file1', 'url1'],
      ['', 'id-2', 'file2', 'url2'],
    ];
    const written: {row: number; column: number; value: unknown}[] = [];

    const sheet = {
      getDataRange: () => ({getValues: () => values}),
      getRange: (row: number, column: number) => ({
        setValue: (value: unknown) => {
          written.push({row, column, value});
        },
      }),
    };

    (global as unknown as {SpreadsheetApp: unknown}).SpreadsheetApp = {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => sheet,
      }),
    };

    fillBlankPaths_();

    expect(written).toEqual([{row: 3, column: 1, value: '/resolved/id-2'}]);
  });

  it('「パス付き差分抽出結果」シートが存在しない場合はエラーを投げる', () => {
    (global as unknown as {SpreadsheetApp: unknown}).SpreadsheetApp = {
      getActiveSpreadsheet: () => ({
        getSheetByName: () => null,
      }),
    };

    expect(() => fillBlankPaths_()).toThrow();
  });
});
