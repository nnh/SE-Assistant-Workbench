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
import {readTargetSpreadsheetIds_} from '../src/target-list-reader';

function mockSpreadsheetApp(sheet: unknown) {
  (global as unknown as {SpreadsheetApp: unknown}).SpreadsheetApp = {
    getActiveSpreadsheet: () => ({
      getSheetByName: () => sheet,
    }),
  };
}

describe('readTargetSpreadsheetIds_', () => {
  it('見出し行を除いたB列のスプレッドシートIDを返す', () => {
    const values = [
      ['名前', 'ID'],
      ['シート1', 'id-1'],
      ['シート2', 'id-2'],
      ['', ''],
    ];
    mockSpreadsheetApp({
      getDataRange: () => ({getValues: () => values}),
    });

    expect(readTargetSpreadsheetIds_()).toEqual(['id-1', 'id-2']);
  });

  it('「抽出対象シート」が存在しない場合はエラーを投げる', () => {
    mockSpreadsheetApp(null);

    expect(() => readTargetSpreadsheetIds_()).toThrow();
  });
});
