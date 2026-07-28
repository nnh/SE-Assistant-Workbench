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
import {resolvePathsForDiffResult_} from '../src/path-lookup';

function mockSpreadsheetApp(diffSheet: unknown, aroSheet: unknown) {
  (global as unknown as {SpreadsheetApp: unknown}).SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: () => diffSheet,
    }),
    openById: () => ({
      getSheetByName: () => aroSheet,
    }),
  };
}

describe('resolvePathsForDiffResult_', () => {
  it('IDが一致する場合はパスを、一致しない場合は空文字を付与する', () => {
    const diffValues = [
      ['名前', 'B', 'ファイル名', 'ID', 'URL', 'F'],
      ['n1', 'b1', 'file1', 'id-1', 'url1', 'f1'],
      ['n2', 'b2', 'file2', 'id-2', 'url2', 'f2'],
    ];
    const aroValues = [
      ['パス', 'ID'],
      ['/path/to/file1', 'id-1'],
    ];

    mockSpreadsheetApp(
      {getDataRange: () => ({getValues: () => diffValues})},
      {getDataRange: () => ({getValues: () => aroValues})},
    );

    const result = resolvePathsForDiffResult_('aro-spreadsheet-id');

    expect(result.header).toEqual(['パス', 'ID', 'ファイル名', 'URL']);
    expect(result.rows).toEqual([
      ['/path/to/file1', 'id-1', 'file1', 'url1'],
      ['', 'id-2', 'file2', 'url2'],
    ]);
  });

  it('「差分抽出結果」シートが存在しない場合はエラーを投げる', () => {
    mockSpreadsheetApp(null, {
      getDataRange: () => ({getValues: () => [['A']]}),
    });

    expect(() => resolvePathsForDiffResult_('aro-spreadsheet-id')).toThrow();
  });

  it('「ARO外部共有ファイル一覧」シートが存在しない場合はエラーを投げる', () => {
    mockSpreadsheetApp(
      {getDataRange: () => ({getValues: () => [['A']]})},
      null,
    );

    expect(() => resolvePathsForDiffResult_('aro-spreadsheet-id')).toThrow();
  });
});
