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
 * スクリプトプロパティからフォルダIDを取得し、
 * その中の全スプレッドシートを列挙して返す
 */
const getSpreadsheetsInFolder_ = (): GoogleAppsScript.Drive.File[] => {
  // 1. スクリプトプロパティからフォルダIDを取得
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('FOLDER_ID');

  if (!folderId) {
    throw new Error('スクリプトプロパティ "FOLDER_ID" が設定されていません。');
  }

  try {
    // 2. フォルダを取得
    const folder = DriveApp.getFolderById(folderId);
    // 3. フォルダ内のファイルを取得し、スプレッドシートのみ抽出
    const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
    const spreadsheetFiles: GoogleAppsScript.Drive.File[] = [];

    while (files.hasNext()) {
      spreadsheetFiles.push(files.next());
    }

    return spreadsheetFiles;
  } catch (e) {
    console.error(`フォルダの取得中にエラーが発生しました: ${e}`);
    throw e;
  }
};
/**
 * 指定したフォルダ内の全スプレッドシートからデータを集約し、
 * このスクリプトを実行しているシート「GAS」に出力する
 */
export const aggregateDataToGasSheet_ = (): void => {
  const TARGET_SHEET_NAME = 'GAS';
  const ssFiles = getSpreadsheetsInFolder_(); // 先ほど作成した関数

  const combinedData: string[][] = [];
  let header: string[] = [];

  ssFiles.forEach((file, index) => {
    const ss = SpreadsheetApp.openById(file.getId());
    const sheet = ss.getSheets()[0]; // シートは1つしかない前提
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();

    if (lastRow < 1) return; // 空のシートはスキップ

    // 1. 最初に見つかったシートから見出し（1行目）を取得
    if (index === 0) {
      header = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    }

    // 2. 2行目以降のデータを取得
    if (lastRow >= 2) {
      const data = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
      combinedData.push(...data);
    }
  });

  // 3. 出力先シート（GAS）の準備
  const activeSs = SpreadsheetApp.getActiveSpreadsheet();
  let gasSheet = activeSs.getSheetByName(TARGET_SHEET_NAME);

  if (!gasSheet) {
    gasSheet = activeSs.insertSheet(TARGET_SHEET_NAME);
  }

  // 4. 出力先をクリアして書き込み
  gasSheet.clear();

  if (combinedData.length > 0) {
    // 見出しとデータを結合して書き込み
    const outputValues = [header, ...combinedData];
    gasSheet
      .getRange(1, 1, outputValues.length, outputValues[0].length)
      .setValues(outputValues);

    // 5. 仕上げ（1行目を固定、フィルタ設置など）
    gasSheet.setFrozenRows(1);
    console.log(`${combinedData.length} 行のデータを集約しました。`);
  } else {
    // データがない場合も見出しだけは作成
    if (header.length > 0) {
      gasSheet.getRange(1, 1, 1, header.length).setValues([header]);
    }
    console.warn('集約対象のデータが見つかりませんでした。');
  }
};

/**
 * RシートとGASシートの値を比較し、最初の相違点で停止する
 * 日付オブジェクトは自動的にISO形式の文字列に変換して比較します
 */
export const compareSheetsUntilFirstDiff_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetR = ss.getSheetByName('R');
  const sheetGas = ss.getSheetByName('GAS');

  if (!sheetR || !sheetGas) {
    console.error('比較対象のシート（R または GAS）が見つかりません。');
    return;
  }

  // 型定義: string | number | boolean | Date
  const dataR = sheetR.getDataRange().getValues() as string[][];
  const dataGas = sheetGas.getDataRange().getValues() as string[][];

  const rowCountR = dataR.length;
  const rowCountGas = dataGas.length;
  const maxRows = Math.max(rowCountR, rowCountGas);

  console.log('比較を開始します（日付形式を正規化して比較）...');

  for (let r = 0; r < maxRows; r++) {
    const rowR = dataR[r] || [];
    const rowGas = dataGas[r] || [];
    const maxCols = Math.max(rowR.length, rowGas.length);

    for (let c = 0; c < maxCols; c++) {
      const valRRaw = rowR[c];
      const valGasRaw = rowGas[c];

      // 値を文字列に変換する関数（日付なら先頭10文字のYYYY-MM-DDのみを抽出）
      const normalizeValue = (
        val: string | number | boolean | Date | undefined | null
      ): string => {
        if (val === undefined || val === null) return '';

        if (val instanceof Date) {
          // タイムゾーンによるズレを防ぐため、スプレッドシートの表示上の日付（JST想定）を
          // yyyy-MM-dd 形式で取得する
          return Utilities.formatDate(val, 'JST', 'yyyy-MM-dd');
        }

        const strVal = String(val).trim();

        // R側の値が ISO形式 (2024-07-12T00:00:00.000Z) の場合、先頭10文字だけを切り出す
        if (/^\d{4}-\d{2}-\d{2}T/.test(strVal)) {
          return strVal.substring(0, 10);
        }

        return strVal;
      };
      const valR = normalizeValue(valRRaw);
      const valGas = normalizeValue(valGasRaw);

      if (valR !== valGas) {
        const cellAddress = `行: ${r + 1}, 列: ${c + 1} (A1: ${sheetR.getRange(r + 1, c + 1).getA1Notation()})`;
        console.log(`❌ 相違発見！`);
        console.log(`位置: ${cellAddress}`);
        console.log(`Rシート (Normalized): [${valR}]`);
        console.log(`GASシート(Normalized): [${valGas}]`);
        return;
      }
    }
  }

  console.log('✅ すべての値が一致しました（日付形式の差異も解消済み）。');
};
