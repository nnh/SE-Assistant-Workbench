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
import { SHEET_NAME_PERMISSIONS, SHEET_NAME_SHARED_ITEMS } from './const';
/**
 * 「共有権限一覧」シートからアクセス種別が PRIVATE 以外の行を抽出し、
 * 別の専用シートに出力します。
 */
export function extractSharedItems_(): void {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sourceSheet = ss.getSheetByName(SHEET_NAME_PERMISSIONS);
    let outputSheet = ss.getSheetByName(SHEET_NAME_SHARED_ITEMS);

    if (!sourceSheet) {
      throw new Error(
        `元データとなるシート "${SHEET_NAME_PERMISSIONS}" が見つかりません。`
      );
    }

    // 1. 出力先シートがない場合は作成する
    if (!outputSheet) {
      outputSheet = ss.insertSheet(SHEET_NAME_SHARED_ITEMS);
    } else {
      outputSheet.clear(); // 既存データをクリアして再作成
    }

    // 2. データの取得
    const lastRow = sourceSheet.getLastRow();
    const lastCol = sourceSheet.getLastColumn();

    if (lastRow < 1) {
      console.log('データが存在しません。');
      return;
    }

    const allData = sourceSheet.getRange(1, 1, lastRow, lastCol).getValues();
    const header = allData[0];
    const rows = allData.slice(1); // 見出しを除いたデータ行

    // 3. F列(インデックス5)が 指定のキーワード 以外の行をフィルタリング
    const excludedTypes = ['PRIVATE', 'DOMAIN', 'DOMAIN_WITH_LINK'];

    const sharedItems = rows.filter(row => {
      const accessType = String(row[5]).toUpperCase(); // F列の値を大文字で取得

      // 除外リストに含まれていない（!includes）場合のみ抽出対象とする
      return accessType && !excludedTypes.includes(accessType);
    });
    if (sharedItems.length === 0) {
      console.log('PRIVATE 以外のアイテムは見つかりませんでした。');
      outputSheet.getRange(1, 1).setValue('該当する共有アイテムはありません。');
      return;
    }

    // 4. 結果の出力
    const outputData = [header, ...sharedItems]; // 見出しを戻す
    outputSheet
      .getRange(1, 1, outputData.length, outputData[0].length)
      .setValues(outputData);

    // 5. レイアウト調整
    outputSheet.getRange(1, 1, 1, outputData[0].length).setFontWeight('bold');
    outputSheet.setFrozenRows(1);

    console.log(`${sharedItems.length} 件の共有アイテムを抽出しました。`);
  } catch (e) {
    if (e instanceof Error) {
      console.error(`抽出処理でエラーが発生しました: ${e.message}`);
    }
  }
}
