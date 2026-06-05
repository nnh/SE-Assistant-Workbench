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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { hello } from './example-module';
import { getFileActivity_, resolveActorInfo_ } from './fileActivity';

const INPUT_SHEET_NAME = 'input';
const OUTPUT_SHEET_NAME = 'output';
const RESULT_SHEET_NAME = 'result';

/**
 * 必要なシート（input・output）が存在しない場合に作成する初期処理。
 */
function initialize(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  for (const name of [INPUT_SHEET_NAME, OUTPUT_SHEET_NAME, RESULT_SHEET_NAME]) {
    if (!ss.getSheetByName(name)) {
      ss.insertSheet(name);
    }
  }
}

/**
 * "input" シートのA列に記載されたファイルIDごとにアクティビティを取得し、
 * "output" シートへまとめて出力する。出力前にシートをクリアする。
 */
function outputAllFileActivities_(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const inputSheet = ss.getSheetByName(INPUT_SHEET_NAME);
  if (!inputSheet) {
    throw new Error(`シート "${INPUT_SHEET_NAME}" が見つかりません`);
  }

  const lastRow = inputSheet.getLastRow();
  if (lastRow < 1) return;

  const fileIds = inputSheet
    .getRange(1, 1, lastRow, 1)
    .getValues()
    .flat()
    .map(v => String(v).trim())
    .filter(v => v !== '');

  const outputSheet =
    ss.getSheetByName(OUTPUT_SHEET_NAME) ?? ss.insertSheet(OUTPUT_SHEET_NAME);
  outputSheet.clearContents();
  outputSheet
    .getRange(1, 1, 1, 5)
    .setValues([['fileId', 'type', 'timestamp', 'displayName', 'email']]);

  let nextRow = 2;
  for (const fileId of fileIds) {
    const records = getFileActivity_(fileId);
    resolveActorInfo_(records);

    const rows = records.flatMap(record => {
      if (record.actors.length === 0) {
        return [[fileId, record.type, record.timestamp, '', '']];
      }
      return record.actors.map(actor => [
        fileId,
        record.type,
        record.timestamp,
        actor.displayName,
        actor.email,
      ]);
    });

    if (rows.length > 0) {
      outputSheet.getRange(nextRow, 1, rows.length, 5).setValues(rows);
      nextRow += rows.length;
    }
  }
}

/**
 * input シートと output シートをファイルIDで結合し、result シートに出力する。
 * - input シート: 見出しなし、A=fileId, B=区分, C=パス, D=ファイル名
 * - output シート: 1行目が見出し、A=fileId, B=type, C=timestamp, D=displayName, E=email
 * - result シート: 存在しない場合は作成、実行のたびにクリア
 */
function outputMergedResult(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const inputSheet = ss.getSheetByName(INPUT_SHEET_NAME);
  if (!inputSheet)
    throw new Error(`シート "${INPUT_SHEET_NAME}" が見つかりません`);

  const outputSheet = ss.getSheetByName(OUTPUT_SHEET_NAME);
  if (!outputSheet)
    throw new Error(`シート "${OUTPUT_SHEET_NAME}" が見つかりません`);

  // input シート読み込み（見出しなし）
  const inputLastRow = inputSheet.getLastRow();
  const inputRows: string[][] =
    inputLastRow < 1
      ? []
      : inputSheet
          .getRange(1, 1, inputLastRow, 4)
          .getValues()
          .map(row => row.map(v => String(v).trim()));

  // output シート読み込み（1行目が見出しのため2行目から）
  const outputLastRow = outputSheet.getLastRow();
  const emailsByFileId = new Map<string, Set<string>>();
  if (outputLastRow >= 2) {
    const outputRows = outputSheet
      .getRange(2, 1, outputLastRow - 1, 5)
      .getValues();
    for (const row of outputRows) {
      const fileId = String(row[0]).trim();
      const email = String(row[4]).trim();
      if (!fileId) continue;
      if (!emailsByFileId.has(fileId)) emailsByFileId.set(fileId, new Set());
      if (email) emailsByFileId.get(fileId)!.add(email);
    }
  }

  // result シートの準備
  const resultSheet =
    ss.getSheetByName(RESULT_SHEET_NAME) ?? ss.insertSheet(RESULT_SHEET_NAME);
  resultSheet.clearContents();
  resultSheet
    .getRange(1, 1, 1, 5)
    .setValues([['fileId', '区分', 'パス', 'ファイル名', 'メールアドレス']]);

  if (inputRows.length === 0) return;

  const resultRows = inputRows.map(([fileId, category, path, fileName]) => {
    const emails = [...(emailsByFileId.get(fileId) ?? [])].join('\n');
    return [fileId, category, path, fileName, emails];
  });

  resultSheet.getRange(2, 1, resultRows.length, 5).setValues(resultRows);

  // メールアドレス列の折り返し設定
  resultSheet
    .getRange(2, 5, resultRows.length, 1)
    .setWrapStrategy(SpreadsheetApp.WrapStrategy.WRAP);
}

function outputAllFileActivities() {
  outputAllFileActivities_();
}
console.log(hello());
