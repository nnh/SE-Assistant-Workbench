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
 * 編集者サマリーと閲覧者サマリーをIDで結合し、
 * 指定された列順で新しいシートに出力します。
 */
export function mergeExternalSummaries_(): void {
  const outputSheetName = Constants.SHEET_NAME_EXTERNAL_EDITORS_VIEWERS;
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const edSheet = ss.getSheetByName(
      Constants.SHEET_NAME_EXTERNAL_EDITORS_SUMMARY
    );
    const vwSheet = ss.getSheetByName(
      Constants.SHEET_NAME_EXTERNAL_VIEWERS_SUMMARY
    );
    let outputSheet = ss.getSheetByName(outputSheetName);

    if (!edSheet || !vwSheet) {
      throw new Error('元データとなるサマリーシートが見つかりません。');
    }

    // 1. 出力シートの準備
    if (!outputSheet) {
      outputSheet = ss.insertSheet(outputSheetName);
    } else {
      outputSheet.clear();
    }

    // 2. データの取得
    const edData = edSheet.getDataRange().getValues();
    const vwData = vwSheet.getDataRange().getValues();

    // ヘッダー行から列インデックスを特定（D列:ID, I列:ユーザー）
    const ID_IDX = 3;
    const USER_IDX = 8;

    // 3. IDをキーにして結合用マップを作成
    // Map<ID, rowData>
    const mergedMap = new Map<
      string,
      { row: string[]; editors: string; viewers: string }
    >();

    // 編集者データの取り込み
    edData.slice(1).forEach(row => {
      const id = String(row[ID_IDX]);
      if (!id) return;
      const data = [...row];
      const editors = data[USER_IDX];
      // 結合用に「編集者」を保持し、「閲覧者」列(J列相当)は一旦空にする
      mergedMap.set(id, { row: data, editors: editors, viewers: '' });
    });

    // 閲覧者データのマージ
    vwData.slice(1).forEach(row => {
      const id = String(row[ID_IDX]);
      if (!id) return;
      const viewers = row[USER_IDX];

      if (mergedMap.has(id)) {
        mergedMap.get(id)!.viewers = viewers;
      } else {
        // 編集者がいないファイルの場合
        mergedMap.set(id, { row: [...row], editors: '', viewers: viewers });
      }
    });

    // 4. 指定された列順に並び替え
    // 希望順：タイプ(0), パス(1), 名前(2), ID(3), URL(4), アクセス種別(5), 権限(6), オーナー(7), 編集者(新), 閲覧者(新), ショートカット元(10), フォルダID(11), ファイル名(12)
    const finalHeader = [
      'タイプ',
      'パス',
      '名前',
      'ID',
      'URL',
      'アクセス種別',
      '権限',
      'オーナー',
      '編集者',
      '閲覧者',
      'ショートカット元',
      'ファイル名',
    ];

    const resultRows = Array.from(mergedMap.values()).map(item => {
      const r = item.row;
      return [
        r[0], // タイプ
        r[1], // パス
        r[2], // 名前
        r[3], // ID
        r[4], // URL
        r[5], // アクセス種別
        r[6], // 権限
        r[7], // オーナー
        item.editors, // 編集者 (集約済み)
        item.viewers, // 閲覧者 (集約済み)
        r[9], // ショートカット元
        r[10], // ファイル名
      ];
    });

    // 5. 出力
    if (resultRows.length > 0) {
      const outputData = [finalHeader, ...resultRows];
      outputSheet
        .getRange(1, 1, outputData.length, outputData[0].length)
        .setValues(outputData);

      // フォーマット調整
      outputSheet.getRange(1, 1, 1, outputData[0].length).setFontWeight('bold');
      outputSheet.setFrozenRows(1);
      outputSheet.getRange(1, 9, outputData.length, 2).setWrap(true); // 編集者・閲覧者列を折り返し
    }

    console.log(`結合完了: ${outputSheetName}`);
  } catch (e) {
    if (e instanceof Error) console.error(e.message);
  }
}
