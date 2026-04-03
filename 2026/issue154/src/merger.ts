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
import * as consts from './consts';

/**
 * 分割された各シートをIDをキーに左結合し、元の共有権限シートと同じ形式で統合シートを作成します。
 */
export const mergeSheetsById_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 各シートのデータを取得
  const basicData = getSheetValues_(ss, consts.SHEET_NAME.BASIC_INFO);
  const accessData = getSheetValues_(ss, consts.SHEET_NAME.ACCESS_INFO);
  const editorData = getSheetValues_(ss, consts.SHEET_NAME.EDITOR_LIST);
  const viewerData = getSheetValues_(ss, consts.SHEET_NAME.VIEWER_LIST);

  if (!basicData.length) {
    console.warn('基本情報シートにデータがないため、結合をスキップします。');
    return;
  }

  // 結合用マップの作成（IDをキーにする）
  const accessMap = createMap_(accessData, 0); // ID, アクセス種別, 権限
  const editorMap = createMap_(editorData, 0); // ID, 外部編集者リスト
  const viewerMap = createMap_(viewerData, 0); // ID, 外部閲覧者リスト

  // 基本情報をベースに結合し、列を並び替える
  const mergedRows = basicData
    .map(basicRow => {
      const id = String(basicRow[3]); // 基本情報のID

      const access = accessMap.get(id) || ['', '', '']; // [ID, アクセス種別, 権限]
      const editor = editorMap.get(id) || ['', '']; // [ID, 外部編集者リスト]
      const viewer = viewerMap.get(id) || ['', '']; // [ID, 外部閲覧者リスト]

      return [
        basicRow[0], // 0: タイプ
        basicRow[1], // 1: パス
        basicRow[2], // 2: 名前
        basicRow[3], // 3: ID
        basicRow[4], // 4: URL
        access[1], // 5: アクセス種別 (ANYONE_WITH_LINK等)
        access[2], // 6: 権限
        basicRow[5], // 7: オーナー
        editor[1], // 8: 外部編集者リスト
        viewer[1], // 9: 外部閲覧者リスト
        basicRow[6], // 10: ショートカット元ID
      ];
    })
    .filter(row => {
      // 5行目(アクセス種別), 8行目(編集者), 9行目(閲覧者) のいずれかに値があるか判定
      const hasAccessType = String(row[5] || '').trim() !== '';
      const hasExternalEditor = String(row[8] || '').trim() !== '';
      const hasExternalViewer = String(row[9] || '').trim() !== '';

      // いずれかが true なら残す
      return hasAccessType || hasExternalEditor || hasExternalViewer;
    });

  const header = [
    'タイプ',
    'パス',
    '名前',
    'ID',
    'URL',
    'アクセス種別',
    '権限',
    'オーナー',
    '外部編集者',
    '外部閲覧者',
    'ショートカット元ID',
  ];

  updateOutputSheet_(
    ss,
    consts.SHEET_NAME.EXTERNAL_SHARED_ITEMS,
    header,
    mergedRows
  );
  console.log('✅ 外部共有に絞ったデータの統合が完了しました。');
};

/**
 * シートのデータを取得（ヘッダーを除く）
 */
const getSheetValues_ = (
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: string
): string[][] => {
  const sheet = ss.getSheetByName(name);
  if (!sheet || sheet.getLastRow() < 2) return [];
  return sheet
    .getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .getValues();
};

/**
 * IDをキーにしたMapを作成
 */
const createMap_ = (
  data: string[][],
  keyIndex: number
): Map<string, string[]> => {
  const map = new Map<string, string[]>();
  data.forEach(row => {
    map.set(String(row[keyIndex]), row);
  });
  return map;
};

/**
 * シートの上書き出力
 */
const updateOutputSheet_ = (
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: string,
  header: string[],
  data: string[][]
): void => {
  const sheet = ss.getSheetByName(name) || ss.insertSheet(name);
  sheet.clear();
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }
  sheet.setFrozenRows(1);
};
