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
import {
  SHEET_NAME_EXTERNAL_EDITORS_SUMMARY,
  SHEET_NAME_EXTERNAL_VIEWERS_SUMMARY,
  SHEET_NAME_EXTERNAL_EDITORS,
  SHEET_NAME_EXTERNAL_VIEWERS,
} from './const';

export function execAggregateEmailsById_(): void {
  aggregateEmailsById_(
    SHEET_NAME_EXTERNAL_EDITORS,
    SHEET_NAME_EXTERNAL_EDITORS_SUMMARY
  );
  aggregateEmailsById_(
    SHEET_NAME_EXTERNAL_VIEWERS,
    SHEET_NAME_EXTERNAL_VIEWERS_SUMMARY
  );
}

/**
 * 指定された入力シートのデータをID(D列)ごとに集約し、
 * メールアドレス(I列)をセル内改行で連結して出力シートに書き出します。
 * @param {string} inputSheetName - 元データがあるシート名
 * @param {string} outputSheetName - 集約結果を書き出すシート名
 */
function aggregateEmailsById_(
  inputSheetName: string,
  outputSheetName: string
): void {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const inputSheet = ss.getSheetByName(inputSheetName);
    let outputSheet = ss.getSheetByName(outputSheetName);

    if (!inputSheet) {
      throw new Error(`入力シート "${inputSheetName}" が見つかりません。`);
    }

    // 1. 出力シートの準備
    if (!outputSheet) {
      outputSheet = ss.insertSheet(outputSheetName);
    } else {
      outputSheet.clear();
    }

    // 2. データの取得
    const lastRow = inputSheet.getLastRow();
    const lastCol = inputSheet.getLastColumn();
    if (lastRow < 2) return; // データがない（見出しのみ）場合は終了

    const allData = inputSheet.getRange(1, 1, lastRow, lastCol).getValues();
    const header = allData[0];
    const rows = allData.slice(1);

    // D列(Index: 3) = ID, I列(Index: 8) = メールアドレス
    const idIndex = 3;
    const emailIndex = 8;

    // 3. IDごとにデータを集約 (Mapオブジェクトを使用)
    // key: ID, value: rowデータの配列（メールアドレスは蓄積用配列にする）
    const aggregationMap = new Map<
      string,
      { fullRow: string[]; emails: Set<string> }
    >();

    rows.forEach(row => {
      const id = String(row[idIndex]).trim();
      const email = String(row[emailIndex]).trim();
      if (!id) return;

      if (!aggregationMap.has(id)) {
        // 初めて登場するIDの場合、行データとメール保持用のSet（重複除外用）を作成
        aggregationMap.set(id, {
          fullRow: [...row],
          emails: new Set(email ? [email] : []),
        });
      } else {
        // 既に存在するIDの場合、メールアドレスを追加
        if (email) {
          aggregationMap.get(id)!.emails.add(email);
        }
      }
    });

    // 4. 出力用データの整形
    const outputRows: string[][] = [];
    aggregationMap.forEach(value => {
      const targetRow = value.fullRow;
      // メールアドレス列(I列)を、Setの内容を改行で連結した文字列に差し替え
      targetRow[emailIndex] = Array.from(value.emails).join('\n');
      outputRows.push(targetRow);
    });

    // 5. 結果の書き出し
    if (outputRows.length > 0) {
      const outputData = [header, ...outputRows];
      outputSheet
        .getRange(1, 1, outputData.length, outputData[0].length)
        .setValues(outputData);

      // レイアウト調整
      outputSheet.getRange(1, 1, 1, outputData[0].length).setFontWeight('bold');
      outputSheet.setFrozenRows(1);
      // メール列(I列)の折り返し設定を有効にする
      outputSheet
        .getRange(1, emailIndex + 1, outputData.length, 1)
        .setWrap(true);

      console.log(
        `${outputSheetName}: ${outputRows.length} 件に集約しました。`
      );
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(`集約エラー (${outputSheetName}): ${e.message}`);
    }
  }
}
