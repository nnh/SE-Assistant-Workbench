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
import {extractMissingRows_} from '../src/diff-extractor';

function mockSpreadsheetApp(sheets: Record<string, unknown>) {
  (global as unknown as {SpreadsheetApp: unknown}).SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: (name: string) => sheets[name] ?? null,
    }),
  };
}

describe('extractMissingRows_', () => {
  it('F列がANYONE_WITH_LINKかつ比較先のB列に存在しないD列の行だけを抽出する', () => {
    const sourceHeader = ['A', 'B', 'C', 'D', 'E', 'F'];
    const sourceValues = [
      sourceHeader,
      ['a1', 'b1', 'c1', 'id-1', 'e1', 'ANYONE_WITH_LINK'],
      ['a2', 'b2', 'c2', 'id-2', 'e2', 'ANYONE_WITH_LINK'],
      ['a3', 'b3', 'c3', 'id-3', 'e3', 'ANYONE_WITH_LINK'],
      ['a4', 'b4', 'c4', 'id-4', 'e4', 'PRIVATE'],
    ];
    const comparisonValues = [
      ['見出し', '見出し'],
      ['x', 'id-1'],
    ];

    mockSpreadsheetApp({
      '（移動前）共有権限抽出結果': {
        getDataRange: () => ({getValues: () => sourceValues}),
      },
      '（移動後）外部共有リンクを知っている全員': {
        getDataRange: () => ({getValues: () => comparisonValues}),
      },
    });

    const result = extractMissingRows_();

    expect(result.header).toEqual(sourceHeader);
    expect(result.rows).toEqual([
      ['a2', 'b2', 'c2', 'id-2', 'e2', 'ANYONE_WITH_LINK'],
      ['a3', 'b3', 'c3', 'id-3', 'e3', 'ANYONE_WITH_LINK'],
    ]);
  });

  it('内容が完全一致する重複行は1つにまとめる', () => {
    const sourceHeader = ['A', 'B', 'C', 'D', 'E', 'F'];
    const sourceValues = [
      sourceHeader,
      ['a1', 'b1', 'c1', 'id-1', 'e1', 'ANYONE_WITH_LINK'],
      ['a1', 'b1', 'c1', 'id-1', 'e1', 'ANYONE_WITH_LINK'],
      ['a2', 'b2', 'c2', 'id-2', 'e2', 'ANYONE_WITH_LINK'],
    ];
    const comparisonValues = [['見出し', '見出し']];

    mockSpreadsheetApp({
      '（移動前）共有権限抽出結果': {
        getDataRange: () => ({getValues: () => sourceValues}),
      },
      '（移動後）外部共有リンクを知っている全員': {
        getDataRange: () => ({getValues: () => comparisonValues}),
      },
    });

    const result = extractMissingRows_();

    expect(result.rows).toEqual([
      ['a1', 'b1', 'c1', 'id-1', 'e1', 'ANYONE_WITH_LINK'],
      ['a2', 'b2', 'c2', 'id-2', 'e2', 'ANYONE_WITH_LINK'],
    ]);
  });

  it('「（移動前）共有権限抽出結果」シートが存在しない場合はエラーを投げる', () => {
    mockSpreadsheetApp({});

    expect(() => extractMissingRows_()).toThrow();
  });

  it('「（移動後）外部共有リンクを知っている全員」シートが存在しない場合はエラーを投げる', () => {
    mockSpreadsheetApp({
      '（移動前）共有権限抽出結果': {
        getDataRange: () => ({getValues: () => [['A']]}),
      },
    });

    expect(() => extractMissingRows_()).toThrow();
  });
});
