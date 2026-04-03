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
  SHEET_NAME_EDITORS,
  SHEET_NAME_VIEWERS,
  SHEET_NAME_EXTERNAL_EDITORS,
  SHEET_NAME_EXTERNAL_VIEWERS,
} from './const';

export function execExtractExternalUsers_(): void {
  extractExternalUsers_(SHEET_NAME_EDITORS, SHEET_NAME_EXTERNAL_EDITORS);
  extractExternalUsers_(SHEET_NAME_VIEWERS, SHEET_NAME_EXTERNAL_VIEWERS);
}
/**
 * 指定された入力シートから、特定のドメイン以外のメールアドレス（I列）を持つ行を抽出し、
 * 出力シートに書き出します。
 *
 * @param {string} inputSheetName - 元データがあるシート名
 * @param {string} outputSheetName - 抽出結果を書き出すシート名
 */
function extractExternalUsers_(
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

    // 1. 出力シートの準備（なければ作成、あれば初期化）
    if (!outputSheet) {
      outputSheet = ss.insertSheet(outputSheetName);
    } else {
      outputSheet.clear();
    }

    // 2. データの取得
    const lastRow = inputSheet.getLastRow();
    const lastCol = inputSheet.getLastColumn();
    if (lastRow < 1) return; // データが空なら終了

    const allData = inputSheet.getRange(1, 1, lastRow, lastCol).getValues();
    const header = allData[0];
    const rows = allData.slice(1);

    // 3. 除外ドメインの定義
    const internalDomains = ['@nnh.go.jp', '@nagoya.hosp.go.jp'];

    // 4. フィルタリング（I列 = Index 8）
    const externalRows = rows.filter(row => {
      const email = String(row[8]).toLowerCase().trim();

      // メールアドレスが空でなく、かつどの内部ドメインでも終わらない（endsWith）ものを抽出
      return (
        email !== '' && !internalDomains.some(domain => email.endsWith(domain))
      );
    });

    // 5. 結果の出力
    if (externalRows.length > 0) {
      const outputData = [header, ...externalRows];
      outputSheet
        .getRange(1, 1, outputData.length, outputData[0].length)
        .setValues(outputData);

      // レイアウト調整
      outputSheet.getRange(1, 1, 1, outputData[0].length).setFontWeight('bold');
      outputSheet.setFrozenRows(1);

      console.log(
        `${outputSheetName}: ${externalRows.length} 件の外部ユーザーを抽出しました。`
      );
    } else {
      outputSheet
        .getRange(1, 1)
        .setValue('該当する外部ドメインのユーザーは見つかりませんでした。');
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(`抽出エラー (${outputSheetName}): ${e.message}`);
    }
  }
}
