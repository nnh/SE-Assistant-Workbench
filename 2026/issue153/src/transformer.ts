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
 * シートデータを加工し、フォルダとファイルでシートを分けて出力します。
 * @param data - 加工元の2次元配列（1行目は見出し）
 * @param folderSheetName - フォルダデータの出力先シート名
 * @param fileSheetName - ファイルデータの出力先シート名
 * @param excludePaths - 除外したいパスの完全一致リスト
 */
export const processAndSplitOutput_ = (
  data: string[][],
  folderSheetName: string,
  fileSheetName: string,
  excludePaths: string[] = []
): void => {
  if (data.length === 0) return;

  const header = data[0];
  const rows = data.slice(1);

  // 1. 対象外パスのフィルタリング（完全一致）
  const filteredRows = rows.filter(row => {
    const path = row[1]; // B列: パス

    // パスが存在しない行は残す
    if (path === undefined || path === null) return true;

    // excludePaths のいずれかと「完全に一致」するかチェック
    // 一致するものがあれば true になるので、! で反転させて除外する
    const isExcluded = excludePaths.some(excludePath => path === excludePath);
    return !isExcluded;
  });

  // 2. データの加工（パスの切り詰め）
  const processedRows = filteredRows.map(row => {
    const type = row[0]; // A列
    let path = row[1]; // B列

    if (type === 'フォルダ' && path && typeof path === 'string') {
      const lastSlashIndex = path.lastIndexOf('/');
      if (lastSlashIndex !== -1) {
        path = path.substring(0, lastSlashIndex);
      }
    }

    const newRow = [...row];
    newRow[1] = path;
    return newRow;
  });

  // 3. フォルダとファイルに振り分け
  const folderData = processedRows.filter(row => row[0] === 'フォルダ');
  const fileData = processedRows.filter(row => row[0] === 'ファイル');

  // 4. 各シートに出力
  saveToSheet_(folderSheetName, [header, ...folderData]);
  saveToSheet_(fileSheetName, [header, ...fileData]);
};

/**
 * 指定したシートにデータを保存する内部用関数
 * @param sheetName - 出力先シート名
 * @param fullData - ヘッダーを含む全データ
 */
const saveToSheet_ = (sheetName: string, fullData: string[][]): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }

  // データがヘッダーのみ（中身が空）でないか確認
  if (fullData.length > 1) {
    sheet
      .getRange(1, 1, fullData.length, fullData[0].length)
      .setValues(fullData);
  } else if (fullData.length === 1) {
    // ヘッダーのみ書き込み
    sheet.getRange(1, 1, 1, fullData[0].length).setValues(fullData);
  }
};
