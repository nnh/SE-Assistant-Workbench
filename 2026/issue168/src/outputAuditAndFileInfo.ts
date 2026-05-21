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
import * as Const from './const';

export function outputAuditAndFileInfo_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const auditSheet = ss.getSheetByName(Const.SHEET_NAME.AUDIT_LOG);
  const fileSheet = ss.getSheetByName(Const.SHEET_NAME.FILE);
  if (!auditSheet) {
    throw new Error(
      `「${Const.SHEET_NAME.AUDIT_LOG}」シートが見つかりません。`
    );
  }
  if (!fileSheet) {
    throw new Error(`「${Const.SHEET_NAME.FILE}」シートが見つかりません。`);
  }
  const auditData: string[][] = auditSheet.getDataRange().getValues();
  const fileData: string[][] = fileSheet.getDataRange().getValues();
  //
  const filteredFileData = fileData.filter(
    row =>
      row[1] !== Const.FILE_INFO.MY_DRIVE && row[1] !== Const.FILE_INFO.ERROR
  );
  // ここでauditDataとfileDataを必要に応じて処理して、出力用のデータを作成する
  const outputSheetName = Const.SHEET_NAME.OUTPUT;
  let outputSheet = ss.getSheetByName(outputSheetName);
  if (!outputSheet) {
    outputSheet = ss.insertSheet(outputSheetName);
  } else {
    outputSheet.clear(); // 既存のデータをクリア
  }
  const auditIdColIndex = 1; // 2列目にファイルIDがある想定
  const fileIdColIndex = 0; // 1列目にファイルIDがある想定
  const headers = auditData[0].concat(fileData[0].slice(1)); // 例: auditDataのヘッダーとfileDataの2列目以降のヘッダーを結合
  const outputValues: string[][] = [headers]; // ヘッダー行
  auditData.slice(1).forEach(auditRow => {
    const auditFileId = auditRow[auditIdColIndex];
    const fileInfo = filteredFileData.find(
      fileRow => fileRow[fileIdColIndex] === auditFileId
    );
    if (fileInfo) {
      // auditRowとfileInfoを組み合わせて出力用の行を作成
      const outputRow = [...auditRow, ...fileInfo.slice(1)]; // 例: auditRowの全データとfileInfoの2列目以降を結合
      outputValues.push(outputRow);
    }
  });
  if (outputValues.length > 0) {
    outputSheet
      .getRange(1, 1, outputValues.length, outputValues[0].length)
      .setValues(outputValues);
  }
}
