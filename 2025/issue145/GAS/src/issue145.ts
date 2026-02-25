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
function getGoogleDocumentFromScriptProperties_(): GoogleAppsScript.Document.Document {
  const KEY = 'GOOGLE_DOC_ID';
  const scriptProperties = PropertiesService.getScriptProperties();
  const docId = scriptProperties.getProperty(KEY);
  if (!docId) {
    throw new Error('Google Document ID not found in script properties.');
  }
  return DocumentApp.openById(docId);
}
export function main_() {
  const doc = getGoogleDocumentFromScriptProperties_();
  console.log('Document title:', doc.getName());
  const thisSpreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const studyDataSheet = thisSpreadsheet.getSheetByName('study_data');
  if (!studyDataSheet) {
    throw new Error('Sheet "study_data" not found in the active spreadsheet.');
  }
  const studyName = studyDataSheet.getRange('B1').getValue();

  const tables = [];
  const body = doc.getBody();

  const numElements = body.getNumChildren();
  for (let i = 0; i < numElements; i++) {
    const element = body.getChild(i);
    if (element.getType() === DocumentApp.ElementType.PARAGRAPH) {
      const paragraph = element.asParagraph();
      const text = paragraph.getText();
      if (text.includes('!!!title!!!')) {
        paragraph.setText(text.replace(/!!!title!!!/g, studyName));
      }
    }
  }
  for (let i = 0; i < numElements; i++) {
    const element = body.getChild(i);
    if (element.getType() === DocumentApp.ElementType.TABLE) {
      const table = element.asTable();
      tables.push(table);
    }
  }
  console.log('Number of tables found:', tables.length);
  const crf_table = tables[2];
  outputSheetDataToTable_('crf_data', crf_table);
  const external_table = tables[3];
  outputSheetDataToTable_('external_data', external_table);
  const ads_table = tables[4];
  outputSheetDataToTable_('ads_data', ads_table);
  const ads_programs_table = tables[5];
  outputSheetDataToTable_('ads_programs_data', ads_programs_table);
  const report_programs_table = tables[6];
  outputSheetDataToTable_('report_programs_data', report_programs_table);
  const report_main_table = tables[7];
  outputSheetDataToTable_('report_main_data', report_main_table);
  const qc_ads_table = tables[8];
  outputSheetDataToTable_('qc_ads_data', qc_ads_table);
  const qc_report_table = tables[9];
  outputSheetDataToTable_('qc_report_data', qc_report_table);
}
/**
 * 指定したスプレッドシートのシートからデータを取得し、指定したGoogleドキュメントのテーブルに出力する関数
 * @param sheetName データを取得するシート名
 * @param table 出力先のGoogleドキュメントのテーブル
 */
export function outputSheetDataToTable_(
  sheetName: string,
  table: GoogleAppsScript.Document.Table
) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" not found.`);
  }
  const data = sheet.getDataRange().getValues();
  // 1行目（ヘッダー）を削除
  data.shift();

  // 既存のテーブル行を最初の2行だけ残して削除してから、必要な行数を追加
  while (table.getNumRows() > 2) {
    table.removeRow(2);
  }
  // 2行目のテキストを空にする
  if (table.getNumRows() > 1) {
    const secondRow = table.getRow(1);
    for (let i = 0; i < secondRow.getNumCells(); i++) {
      secondRow.getCell(i).setText('');
    }
  }
  while (table.getNumRows() < data.length) {
    table.appendTableRow();
  }

  for (let i = 0; i < data.length; i++) {
    const rowIndex = i + 1; // 1行目はヘッダーなので2行目から
    let row: GoogleAppsScript.Document.TableRow;
    if (table.getNumRows() > rowIndex) {
      row = table.getRow(rowIndex);
    } else {
      row = table.appendTableRow();
    }
    // 行のセル数を調整（必要ならセル追加）
    while (row.getNumCells() < data[i].length) {
      row.appendTableCell('');
    }
    for (let j = 0; j < data[i].length; j++) {
      row.getCell(j).setText(String(data[i][j]));
    }
  }
}
