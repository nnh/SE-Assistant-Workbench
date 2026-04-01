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
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { SHEET_NAME_PERMISSIONS } from './const';
/**
 * 指定されたURLのスプレッドシートから「共有権限」シートのデータを取得し、
 * 指定の集約シートの末尾にファイル名を添えて追記します。
 * @param {string} url - 取得先スプレッドシートのURL
 */
export function appendSharedPermissions_(url: string): void {
  try {
    // 1. 対象のスプレッドシートとシートを開く
    const targetSs = SpreadsheetApp.openByUrl(url);
    const fileName = targetSs.getName();
    const targetSheet = targetSs.getSheetByName('共有権限');

    if (!targetSheet) {
      console.warn(`シート「共有権限」が見つかりません: ${fileName}`);
      return;
    }

    // 2. データの取得（1行目の見出しを除いたデータのみ）
    const lastRow = targetSheet.getLastRow();
    const lastCol = targetSheet.getLastColumn();

    if (lastRow < 2) {
      console.log(`コピーするデータがありません: ${fileName}`);
      return;
    }

    // 2行目から最終行までを取得
    const data = targetSheet.getRange(2, 1, lastRow - 1, lastCol).getValues();

    // 3. 各行の末尾にファイル名を追加
    const processedData = data.map(row => {
      row.push(fileName);
      return row;
    });

    // 4. 書き込み先（出力シート）の準備
    const thisSs = SpreadsheetApp.getActiveSpreadsheet();
    const outputSheet = thisSs.getSheetByName(SHEET_NAME_PERMISSIONS);
    if (!outputSheet) {
      throw new Error(`シート "${SHEET_NAME_PERMISSIONS}" が見つかりません。`);
    }

    const destLastRow = outputSheet.getLastRow();
    let startRow: number;

    // 5. シートが空なら見出しを作成、そうでなければ最終行の次に設定
    if (destLastRow === 0) {
      // 元シートの1行目（見出し）を取得し、末尾に「ファイル名」を追加
      const originalHeader = targetSheet
        .getRange(1, 1, 1, lastCol)
        .getValues()[0];
      originalHeader.push('ファイル名');

      // 見出しを1行目に書き込み
      outputSheet
        .getRange(1, 1, 1, originalHeader.length)
        .setValues([originalHeader]);
      outputSheet
        .getRange(1, 1, 1, originalHeader.length)
        .setFontWeight('bold');
      outputSheet.setFrozenRows(1); // 1行目を固定

      startRow = 2;
    } else {
      startRow = destLastRow + 1;
    }

    // 6. データの追記
    outputSheet
      .getRange(startRow, 1, processedData.length, processedData[0].length)
      .setValues(processedData);

    console.log(`追記完了: ${fileName} (${processedData.length} 件)`);
  } catch (e) {
    if (e instanceof Error) {
      console.error(`エラーが発生しました (URL: ${url}): ${e.message}`);
    } else {
      console.error(`予期せぬエラーが発生しました (URL: ${url}):`, e);
    }
  }
}
