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

/**
 * 指定したファイルIDのアクティビティをアクティブスプレッドシートに出力する。
 *
 * @param fileId - Google Drive のファイルID
 */
function outputFileActivity_(fileId: string): void {
  const records = getFileActivity_(fileId);
  resolveActorInfo_(records);

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.insertSheet(`activity_${fileId.slice(0, 8)}`);

  sheet
    .getRange(1, 1, 1, 5)
    .setValues([['fileId', 'type', 'timestamp', 'displayName', 'email']]);

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
    sheet.getRange(2, 1, rows.length, 5).setValues(rows);
  }
}

function test() {
  outputFileActivity_('file-id');
}
console.log(hello());
