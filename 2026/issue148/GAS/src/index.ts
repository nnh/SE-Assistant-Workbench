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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { hello } from './example-module';
import { aggregateDataToGasSheet_ } from './issue148';
/**
 * RシートとGASシートのA列およびW列をキーにして昇順ソートする
 */
const sortTargetSheets = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = ['R', 'GAS'];

  sheetNames.forEach(name => {
    const sheet = ss.getSheetByName(name);

    if (!sheet) {
      console.warn(`シート「${name}」が見つかりませんでした。スキップします。`);
      return;
    }

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    // データがない（見出しのみ、または空）場合はスキップ
    if (lastRow <= 1) return;

    // ソート範囲を指定（2行目から最終行まで）
    const range = sheet.getRange(2, 1, lastRow - 1, lastCol);

    /**
     * sort() メソッドの引数:
     * column: 列番号（1始まり）
     * ascending: true(昇順) / false(降順)
     * * 配列の順序が優先順位になります（A列が第1キー、W列が第2キー）
     */
    range.sort([
      { column: 1, ascending: true }, // A列
      { column: 23, ascending: true }, // W列
    ]);

    console.log(`シート「${name}」をソートしました。`);
  });
};
function aggregateDataToGasSheet(): void {
  aggregateDataToGasSheet_();
}
console.log(hello());
