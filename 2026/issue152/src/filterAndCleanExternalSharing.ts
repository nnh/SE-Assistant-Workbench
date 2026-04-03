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
import * as Constants from './const';

/**
 * 外部共有アイテム一覧シートを元に、以下のクレンジングを行い別シートに出力します。
 * 1. B列（パス）の先頭「ドライブ」を、L列（ファイル名）から整形した部署名に置換
 * 2. I列（編集者）とJ列（閲覧者）から内部ドメインのアドレスを削除
 * 3. 全列が完全に一致する行を1行にまとめる（重複排除）
 */
export function filterAndCleanExternalSharing_(): void {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(
      Constants.SHEET_NAME_ALL_EXTERNAL_USERS
    );
    let outputSheet = ss.getSheetByName(
      Constants.SHEET_NAME_EXTERNAL_SHARING_CLEANSED
    );

    if (!sourceSheet) {
      throw new Error(
        `元データシート "${Constants.SHEET_NAME_ALL_EXTERNAL_USERS}" が見つかりません。`
      );
    }

    // 1. 出力シートの準備
    if (!outputSheet) {
      outputSheet = ss.insertSheet(
        Constants.SHEET_NAME_EXTERNAL_SHARING_CLEANSED
      );
    } else {
      outputSheet.clear();
    }

    const lastRow = sourceSheet.getLastRow();
    const lastCol = sourceSheet.getLastColumn();
    if (lastRow < 2) return;

    const data = sourceSheet.getRange(1, 1, lastRow, lastCol).getValues();
    const header = data[0];
    const rows = data.slice(1);

    // 除外する内部ドメインの定義
    const internalDomains = ['@nnh.go.jp', '@nagoya.hosp.go.jp'];

    // 2. データの加工処理
    const processedRows = rows.map(row => {
      const newRow = [...row];
      const currentPath = String(row[1]); // B列: パス
      const fileName = String(row[11]); // L列: ファイル名
      const editors = String(row[8]); // I列: 編集者
      const viewers = String(row[9]); // J列: 閲覧者

      // --- A. ファイル名の整形とパスの置換 ---
      let formattedName = '';
      const specialCases = [
        '共有ドライブ移動後＿研究管理室＿三回目',
        '共有ドライブ移動後＿研究管理室＿二回目',
        '共有ドライブ移動後＿研究管理室＿一回目',
      ];

      if (specialCases.includes(fileName)) {
        formattedName = '研究管理室';
      } else {
        const parts = fileName.split('＿');
        formattedName = parts[parts.length - 1];
      }
      newRow[1] = currentPath.replace(/^ドライブ/, formattedName);

      // --- B. 内部ドメインのメールアドレス削除 ---
      const filterExternalOnly = (text: string) => {
        return text
          .split('\n')
          .filter(email => {
            const trimmedEmail = email.trim().toLowerCase();
            if (!trimmedEmail) return false;
            // どの内部ドメインにも一致しないものだけ残す
            return !internalDomains.some(domain =>
              trimmedEmail.endsWith(domain)
            );
          })
          .join('\n');
      };

      newRow[8] = filterExternalOnly(editors); // I列を更新
      newRow[9] = filterExternalOnly(viewers); // J列を更新

      return newRow;
    });

    // --- 2.5 重複行の排除 (全列が一致する行を1行にまとめる) ---
    const uniqueRowsMap = new Map<string, string[]>();

    processedRows.forEach(row => {
      // 行の全データを文字列として結合し、一意のキーを作成
      const rowKey = row.map(cell => String(cell)).join('|');

      if (!uniqueRowsMap.has(rowKey)) {
        uniqueRowsMap.set(rowKey, row);
      }
    });

    const finalUniqueRows = Array.from(uniqueRowsMap.values());

    // 3. 結果の出力
    const outputData = [header, ...finalUniqueRows];
    outputSheet
      .getRange(1, 1, outputData.length, outputData[0].length)
      .setValues(outputData);

    console.log(
      `重複排除完了: ${rows.length}件から${finalUniqueRows.length}件に集約しました。`
    );

    // 4. レイアウト調整
    outputSheet.getRange(1, 1, 1, outputData[0].length).setFontWeight('bold');
    outputSheet.setFrozenRows(1);
    outputSheet.getDataRange().setWrap(true);

    console.log(
      `クレンジング完了: ${Constants.SHEET_NAME_EXTERNAL_SHARING_CLEANSED} に出力しました。`
    );
  } catch (e) {
    if (e instanceof Error) {
      console.error(`フィルタリング・クレンジングエラー: ${e.message}`);
    }
  }
}
