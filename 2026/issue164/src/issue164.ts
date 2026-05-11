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
import { CONFIG } from './config';
/**
 * ファイル行の抽出
 */
export const filterValidfiles_ = (data: string[][]): string[][] => {
  if (data.length <= 1) return data;

  const header = data[0];
  const filteredRows = data.slice(1).filter(row => {
    // A列が「フォルダ」以外は除外
    if (row[0] !== 'ファイル') return false;
    // CONFIG.IGNORE_PREFIXES に該当するパスを除外
    const valB = String(row[1]);
    const isIgnored = CONFIG.IGNORE_PREFIXES.some(prefix =>
      valB.startsWith(prefix)
    );
    if (isIgnored) return false;
    return true;
  });

  return [header, ...filteredRows];
};
/**
 * パスの置換・整形を行い、最終シートへ出力
 */
export const generateFinalFormattedFileList_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.MIDDLEFILE);

  if (!sourceSheet) {
    throw new Error(
      `元シート「${CONFIG.SHEET_NAMES.MIDDLEFILE}」が見つかりませんでした。`
    );
  }

  const data = sourceSheet.getDataRange().getValues() as string[][];
  if (data.length <= 1) return;

  const editedData = data
    .map((row, index) => {
      if (index === 0) return row;

      let valB = String(row[1]);

      // ルート接頭辞の削除
      if (valB.startsWith(CONFIG.PATH_RULES.ROOT_PREFIX)) {
        valB = valB.replace(CONFIG.PATH_RULES.ROOT_PREFIX, '');
      }

      // AMEDパスの置換
      if (valB.startsWith(CONFIG.PATH_RULES.AMED_OLD_PATH)) {
        valB = valB.replace(
          CONFIG.PATH_RULES.AMED_OLD_PATH,
          CONFIG.PATH_RULES.AMED_NEW_PATH
        );
      }

      const newRow = [...row];
      newRow[1] = valB;
      return newRow;
    })
    .filter((row, index) => {
      if (index === 0) return true;
      return String(row[1]).trim() !== '';
    });

  let destSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.FINALFILE);
  if (destSheet) {
    destSheet.clear();
  } else {
    destSheet = ss.insertSheet(CONFIG.SHEET_NAMES.FINALFILE);
  }

  destSheet
    .getRange(1, 1, editedData.length, editedData[0].length)
    .setValues(editedData);
  console.log(`${CONFIG.SHEET_NAMES.FINALFILE}への出力が完了しました。`);
};
