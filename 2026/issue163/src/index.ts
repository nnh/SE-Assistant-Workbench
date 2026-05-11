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

console.log(hello());
function outputViewedFilesToActiveSheet(): void {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = spreadsheet.getActiveSheet();

  sheet.clear();
  sheet.appendRow(['ファイル名', '閲覧日時', 'URL', 'フォルダパス']);
  sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f3f3f3');

  // 日本時間 2026/04/22 10:30 を RFC 3339 形式に変換
  const date = new Date('2026-04-22T10:30:00+09:00');
  const startTime = Utilities.formatDate(
    date,
    'UTC',
    "yyyy-MM-dd'T'HH:mm:ss'Z'"
  );

  // v2 では lastViewedByMeDate を使用
  const query = `lastViewedByMeDate > '${startTime}' and trashed = false`;

  if (typeof Drive === 'undefined') {
    throw new Error('Drive API サービスを有効にしてください。');
  }

  try {
    let pageToken: string | undefined = undefined;
    let fileCount = 0;

    do {
      // v2 の引数設定
      const result: GoogleAppsScript.Drive.Schema.FileList = Drive.Files!.list({
        q: query,
        // v2 では fields の指定方法やデフォルト値が v3 と異なるため注意
        orderBy: 'lastViewedByMeDate desc',
        pageToken: pageToken,
      });

      // v2 は 'items' プロパティにファイル一覧が入る
      const files = result.items;

      if (files && files.length > 0) {
        const rows: string[][] = [];

        files.forEach((file: GoogleAppsScript.Drive.Schema.File) => {
          // v2 用のプロパティ名に修正
          const parents = file.parents?.map(p => p.id as string);
          const path = getFilePath_(parents);

          const viewedDate = new Date(file.lastViewedByMeDate!);
          const formattedDate = Utilities.formatDate(
            viewedDate,
            'JST',
            'yyyy/MM/dd HH:mm:ss'
          );

          rows.push([
            file.title || '名称未設定', // v2 は title
            formattedDate,
            file.alternateLink || '', // v2 は alternateLink
            path,
          ]);
        });

        sheet
          .getRange(sheet.getLastRow() + 1, 1, rows.length, 4)
          .setValues(rows);
        fileCount += rows.length;
      }
      pageToken = result.nextPageToken || undefined;
    } while (pageToken);

    if (fileCount === 0) {
      Browser.msgBox(
        '指定した日時以降に閲覧されたファイルは見つかりませんでした。'
      );
    } else {
      Browser.msgBox(fileCount + ' 件のデータを出力しました。');
    }
  } catch (err) {
    if (err instanceof Error) {
      console.error('エラーが発生しました: ' + err.message);
    }
  }
}

/**
 * v2 の parents 構造に対応したパス取得
 */
function getFilePath_(parentIds: string[] | undefined): string {
  if (!parentIds || parentIds.length === 0) {
    return '/マイドライブ（直下）';
  }

  const pathParts: string[] = [];
  let currentId: string | null = parentIds[0];

  while (currentId) {
    try {
      const folder = DriveApp.getFolderById(currentId);
      pathParts.unshift(folder.getName());

      const nextParents = folder.getParents();
      if (nextParents.hasNext()) {
        currentId = nextParents.next().getId();
      } else {
        currentId = null;
      }
    } catch (e) {
      break;
    }
  }
  return '/' + pathParts.join('/');
}
