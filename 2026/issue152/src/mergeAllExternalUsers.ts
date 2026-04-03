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
 * 共有アイテムシートとドメイン外ユーザーシートを縦結合し、
 * ID(D列)をキーに重複を排除・集約して最終一覧シートに出力します。
 */
export function mergeAllExternalUsers_(): void {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sharedSheet = ss.getSheetByName(Constants.SHEET_NAME_SHARED_ITEMS);
    const externalSheet = ss.getSheetByName(
      Constants.SHEET_NAME_EXTERNAL_EDITORS_VIEWERS
    );
    let outputSheet = ss.getSheetByName(
      Constants.SHEET_NAME_ALL_EXTERNAL_USERS
    );

    if (!sharedSheet || !externalSheet) {
      throw new Error('元データとなるシートが見つかりません。');
    }

    // 1. 出力シートの準備
    if (!outputSheet) {
      outputSheet = ss.insertSheet(Constants.SHEET_NAME_ALL_EXTERNAL_USERS);
    } else {
      outputSheet.clear();
    }

    // 2. データの取得
    const sharedData = sharedSheet.getDataRange().getValues();
    const externalData = externalSheet.getDataRange().getValues();

    const sharedHeader = sharedData[0];
    const externalHeader = externalData[0];

    // 3. ID(D列: Index 3)をキーにしたマージ用マップの作成
    // Map<ID, RowData>
    const mergedMap = new Map<string, string[]>();

    /**
     * 行データをマップに登録するヘルパー関数
     * @param dataRows - ヘッダーを除いたデータ行
     * @param header - そのシートのヘッダー
     */
    const addToMap = (dataRows: string[][], header: string[]) => {
      // 出力時の標準列順を定義（ここではsharedHeaderの順序を基準とします）
      const standardHeader = sharedHeader;

      dataRows.forEach(row => {
        const id = String(row[3]); // D列: ID
        if (!id || id === 'ID') return;

        // 現在の行を標準の列順にマッピングした配列を作成
        const mappedRow = standardHeader.map(hName => {
          const colIdx = header.indexOf(hName);
          return colIdx !== -1 ? row[colIdx] : '';
        });

        if (mergedMap.has(id)) {
          // 既にIDが存在する場合、空のセルを補完し合う（非破壊的マージ）
          const existingRow = mergedMap.get(id)!;
          const updatedRow = existingRow.map((val, idx) => {
            // 既存が空で、新しい方に値があれば採用
            return val === '' || val === null ? mappedRow[idx] : val;
          });
          mergedMap.set(id, updatedRow);
        } else {
          mergedMap.set(id, mappedRow);
        }
      });
    };

    // データの流し込み（ヘッダーを除いて処理）
    addToMap(sharedData.slice(1), sharedHeader);
    addToMap(externalData.slice(1), externalHeader);

    // 4. 出力用データの整形
    const resultRows = Array.from(mergedMap.values());

    if (resultRows.length > 0) {
      const outputData = [sharedHeader, ...resultRows];
      outputSheet
        .getRange(1, 1, outputData.length, outputData[0].length)
        .setValues(outputData);

      // レイアウト調整
      outputSheet.getRange(1, 1, 1, outputData[0].length).setFontWeight('bold');
      outputSheet.setFrozenRows(1);

      // 編集者・閲覧者などのセル内改行を考慮した設定
      outputSheet.getDataRange().setWrap(true);
      outputSheet.setFrozenRows(1);

      console.log(
        `統合完了: ${resultRows.length} 件のアイテムを集約しました。`
      );
    } else {
      outputSheet
        .getRange(1, 1)
        .setValue('該当する外部共有アイテムはありません。');
    }
  } catch (e) {
    if (e instanceof Error) {
      console.error(`最終統合エラー: ${e.message}`);
    }
  }
}
