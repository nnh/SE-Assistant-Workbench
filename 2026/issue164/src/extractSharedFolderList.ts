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
 * 1. 指定されたIDのスプレッドシートから生のデータを取得する
 */
export const fetchRawSharedData_ = (): string[][] => {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheetId = scriptProperties.getProperty(
    CONFIG.PROPERTY_KEYS.SS_ID
  );

  if (!spreadsheetId) {
    throw new Error(
      `スクリプトプロパティに ${CONFIG.PROPERTY_KEYS.SS_ID} が設定されていません。`
    );
  }

  const ss = SpreadsheetApp.openById(spreadsheetId);
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAMES.SOURCE);

  if (!sheet) {
    throw new Error(
      `シート名「${CONFIG.SHEET_NAMES.SOURCE}」が見分かませんでした。`
    );
  }

  const lastRow = sheet.getLastRow();
  if (lastRow === 0) return [];

  return sheet.getDataRange().getValues() as string[][];
};

/**
 * 2. フォルダ行の抽出と特定のパスの除外フィルタリング
 */
export const filterValidFolders_ = (data: string[][]): string[][] => {
  if (data.length <= 1) return data;

  const header = data[0];
  const filteredRows = data.slice(1).filter(row => {
    // A列が「フォルダ」以外は除外
    if (row[0] !== 'フォルダ') return false;

    // B列とC列が同じ場合は除外
    if (row[1] === row[2]) return false;

    // CONFIG.IGNORE_PREFIXES に該当するパスを除外
    const valB = String(row[1]);
    const isIgnored = CONFIG.IGNORE_PREFIXES.some(prefix =>
      valB.startsWith(prefix)
    );

    return !isIgnored;
  });

  return [header, ...filteredRows];
};

/**
 * 3. フィルタリング済みデータを中間シートへ出力
 */
export const saveToMiddleSheet_ = (
  data: string[][],
  targetSheetName: string = CONFIG.SHEET_NAMES.MIDDLE
): void => {
  if (data.length === 0) {
    console.warn('出力するデータがありません。');
    return;
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let targetSheet = ss.getSheetByName(targetSheetName);

  if (targetSheet) {
    targetSheet.clear();
  } else {
    targetSheet = ss.insertSheet(targetSheetName);
  }

  targetSheet.getRange(1, 1, data.length, data[0].length).setValues(data);
  console.log(`シート「${targetSheetName}」に出力完了。`);
};

/**
 * 4. パスの置換・整形を行い、最終シートへ出力
 */
export const generateFinalFormattedList_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.MIDDLE);

  if (!sourceSheet) {
    throw new Error(
      `元シート「${CONFIG.SHEET_NAMES.MIDDLE}」が見つかりませんでした。`
    );
  }

  const data = sourceSheet.getDataRange().getValues() as string[][];
  if (data.length <= 1) return;

  const editedData = data
    .map((row, index) => {
      if (index === 0) return row;

      let valB = String(row[1]);
      const valC = String(row[2]);

      // 末尾からC列（ファイル名）を削除
      if (valC && valB.endsWith(valC)) {
        valB = valB.slice(0, -valC.length);
      }

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

  let destSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.FINAL);
  if (destSheet) {
    destSheet.clear();
  } else {
    destSheet = ss.insertSheet(CONFIG.SHEET_NAMES.FINAL);
  }

  destSheet
    .getRange(1, 1, editedData.length, editedData[0].length)
    .setValues(editedData);
  console.log(`${CONFIG.SHEET_NAMES.FINAL}への出力が完了しました。`);
};
