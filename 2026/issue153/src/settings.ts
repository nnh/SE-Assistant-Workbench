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
/**
 * 「対象外パス」シートのA列から除外リストを取得します。
 * @returns 除外パスの配列（文字列）
 */
export const getExcludePaths_ = (): string[] => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('対象外パス');

  // シートが存在しない場合は空配列を返す
  if (!sheet) {
    console.warn(
      '「対象外パス」シートが見つかりません。除外なしで処理を続行します。'
    );
    return [];
  }

  const lastRow = sheet.getLastRow();
  // ヘッダーのみ、または空の場合
  if (lastRow <= 1) {
    return [];
  }

  // A列の2行目から最終行まで取得（A2:A）
  const range = sheet.getRange(2, 1, lastRow - 1, 1);
  const values = range.getValues();

  // 2次元配列を1次元配列にフラット化し、空行を除去
  return values
    .map(row => row[0])
    .filter(value => value !== '' && value !== null && value !== undefined)
    .map(value => String(value)); // 念のため文字列にキャスト
};
