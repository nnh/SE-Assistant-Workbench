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
import {extractShareRows_} from '../src/share-permission-extractor';

function mockSpreadsheetApp(sheet: unknown) {
  (global as unknown as {SpreadsheetApp: unknown}).SpreadsheetApp = {
    openById: () => ({
      getSheetByName: () => sheet,
    }),
  };
}

describe('extractShareRows_', () => {
  it('F列がPRIVATEの行を除外して抽出する', () => {
    const header = ['名前', 'メール', 'C', 'D', 'E', '権限'];
    const values = [
      header,
      ['a', 'a@example.com', '', '', '', 'PRIVATE'],
      ['b', 'b@example.com', '', '', '', 'EDIT'],
      ['c', 'c@example.com', '', '', '', 'VIEW'],
    ];
    mockSpreadsheetApp({
      getDataRange: () => ({getValues: () => values}),
    });

    const result = extractShareRows_('spreadsheet-id');

    expect(result.header).toEqual(header);
    expect(result.rows).toEqual([
      ['b', 'b@example.com', '', '', '', 'EDIT'],
      ['c', 'c@example.com', '', '', '', 'VIEW'],
    ]);
  });

  it('「共有権限」シートが存在しない場合は空の結果を返す', () => {
    mockSpreadsheetApp(null);

    const result = extractShareRows_('spreadsheet-id');

    expect(result).toEqual({header: null, rows: []});
  });
});
