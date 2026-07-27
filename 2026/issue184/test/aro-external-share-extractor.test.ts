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
import {extractAroExternalShareRows_} from '../src/aro-external-share-extractor';

function mockSpreadsheetApp(sheet: unknown) {
  (global as unknown as {SpreadsheetApp: unknown}).SpreadsheetApp = {
    openById: () => ({
      getSheetByName: () => sheet,
    }),
  };
}

describe('extractAroExternalShareRows_', () => {
  it('E列に「リンクを知っている全員」を含む行だけを抽出する（部分一致）', () => {
    const header = ['A', 'B', 'C', 'D', '共有設定'];
    const values = [
      header,
      ['a1', 'b1', 'c1', 'd1', 'リンクを知っている全員'],
      ['a2', 'b2', 'c2', 'd2', '限定公開'],
      ['a3', 'b3', 'c3', 'd3', 'リンクを知っている全員（閲覧者）'],
    ];
    mockSpreadsheetApp({
      getDataRange: () => ({getValues: () => values}),
    });

    const result = extractAroExternalShareRows_('spreadsheet-id');

    expect(result.header).toEqual(header);
    expect(result.rows).toEqual([
      ['a1', 'b1', 'c1', 'd1', 'リンクを知っている全員'],
      ['a3', 'b3', 'c3', 'd3', 'リンクを知っている全員（閲覧者）'],
    ]);
  });

  it('「ARO外部共有ファイル一覧」シートが存在しない場合はエラーを投げる', () => {
    mockSpreadsheetApp(null);

    expect(() => extractAroExternalShareRows_('spreadsheet-id')).toThrow();
  });
});
