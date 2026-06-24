/**
 * Copyright 2026 Google LLC
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
import {PUBLISHED_LABEL, UNPUBLISHED_LABEL} from './constants';

// 対象シートの列番号（1始まり）
const COL_FILE_ID = 3; // C列: ファイルID
const COL_SKIP_FLAG = 4; // D列: 空白でなければスキップ
const COL_RESULT = 5; // E列: ウェブ公開状態の出力先
// データ開始行（1行目はヘッダーとみなす）
const FIRST_DATA_ROW = 2;
// 1回の実行で処理を打ち切るまでの時間（ミリ秒）。GASの6分制限の手前で止める。
const TIME_LIMIT_MS = 5 * 60 * 1000;

/**
 * 実処理。指定シートのC列のファイルIDについて、
 * ウェブに公開（Publish to web）されているかを判定しE列へ出力する。
 * D列が空白でない行、およびE列に値が入っている行は取得をスキップする。
 * GASの実行時間制限を超えないよう一定時間で打ち切り、それまでの結果を書き戻す。
 * 未処理行はE列が空のまま残るので、再実行すれば続きから処理できる。
 */
export function updatePublishStatus_(sheetName: string): void {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`「${sheetName}」シートが見つかりません。`);
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < FIRST_DATA_ROW) {
    return;
  }

  const numRows = lastRow - FIRST_DATA_ROW + 1;
  const fileIds = sheet
    .getRange(FIRST_DATA_ROW, COL_FILE_ID, numRows, 1)
    .getValues();
  const skipFlags = sheet
    .getRange(FIRST_DATA_ROW, COL_SKIP_FLAG, numRows, 1)
    .getValues();
  const resultRange = sheet.getRange(FIRST_DATA_ROW, COL_RESULT, numRows, 1);
  // 既存のE列を読み込み、スキップ行は元の値を保持したまま一括で書き戻す
  const results = resultRange.getValues();

  const startTime = Date.now();
  let processed = 0;
  let remaining = 0;
  for (let i = 0; i < numRows; i++) {
    const fileId = String(fileIds[i][0]).trim();
    // ファイルIDが無い行はスキップ
    if (!fileId) {
      continue;
    }
    // D列が空白でない行はスキップ
    if (String(skipFlags[i][0]).trim() !== '') {
      continue;
    }
    // E列に既に値がある行（処理済み）はスキップ
    if (String(results[i][0]).trim() !== '') {
      continue;
    }
    // 制限時間に達したら、残りは次回の実行に回す
    if (Date.now() - startTime > TIME_LIMIT_MS) {
      remaining++;
      continue;
    }
    results[i][0] = judgePublishStatus_(fileId);
    processed++;
  }

  resultRange.setValues(results);
  console.log(
    remaining > 0
      ? `${processed}件を処理しました。未処理が${remaining}件あります。再実行してください。`
      : `${processed}件を処理しました。未処理はありません。`,
  );
}

/**
 * ファイルのウェブ公開状態を判定してラベルを返す。
 * 取得に失敗した場合はエラー内容を文字列で返す。
 */
function judgePublishStatus_(fileId: string): string {
  try {
    return isPublishedToWeb_(fileId) ? PUBLISHED_LABEL : UNPUBLISHED_LABEL;
  } catch (e) {
    return `エラー: ${e instanceof Error ? e.message : String(e)}`;
  }
}

/**
 * リビジョンの published フラグを見て、ウェブに公開（Publish to web）
 * されているかを判定する。いずれかのリビジョンが公開中なら true。
 */
function isPublishedToWeb_(fileId: string): boolean {
  const res: GoogleAppsScript.Drive_v3.Drive.V3.Schema.RevisionList =
    Drive!.Revisions!.list(fileId, {
      fields: 'revisions(published)',
    });
  const revisions = res.revisions ?? [];
  return revisions.some(revision => revision.published === true);
}
