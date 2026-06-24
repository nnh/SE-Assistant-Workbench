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
import {
  SCRIPT_PROPERTY_KEY,
  SLIDE_OUTPUT_SHEET_NAME,
  MIME_PRESENTATION,
  PAGE_SIZE,
} from './constants';

interface SlideRow {
  type: string;
  name: string;
  id: string;
}

/**
 * 実処理。共有ドライブ配下のスライド（プレゼンテーション）の一覧を
 * アクティブスプレッドシートのシートに出力する。
 */
export function exportSharedDriveSlideList_(): void {
  // スクリプトプロパティから共有ドライブIDを取得
  const driveId =
    PropertiesService.getScriptProperties().getProperty(SCRIPT_PROPERTY_KEY);
  if (!driveId) {
    throw new Error(
      `スクリプトプロパティ「${SCRIPT_PROPERTY_KEY}」に共有ドライブIDを設定してください。`,
    );
  }

  const rows = fetchSlides_(driveId);
  writeSlidesToSheet_(rows);
  console.log(
    `${rows.length}件を「${SLIDE_OUTPUT_SHEET_NAME}」に出力しました。`,
  );
}

/**
 * 共有ドライブ全体をフラット検索し、スライド（プレゼンテーション）を取得する。
 * フォルダ階層を再帰せず、ドライブ全体を1クエリで横断するためAPI呼び出しが少ない。
 */
function fetchSlides_(driveId: string): SlideRow[] {
  const rows: SlideRow[] = [];
  // スライド、かつゴミ箱以外
  const query = `mimeType = '${MIME_PRESENTATION}' and trashed = false`;

  let pageToken: string | undefined = undefined;
  do {
    const res: GoogleAppsScript.Drive_v3.Drive.V3.Schema.FileList =
      Drive!.Files!.list({
        q: query,
        // 共有ドライブ全体を対象にする設定
        corpora: 'drive',
        driveId: driveId,
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        pageSize: PAGE_SIZE,
        fields: 'nextPageToken, files(id, name, mimeType)',
        pageToken: pageToken,
      });

    const files = res.files ?? [];
    for (const file of files) {
      rows.push({
        type: file.mimeType ?? '',
        name: file.name ?? '',
        id: file.id ?? '',
      });
    }
    pageToken = res.nextPageToken ?? undefined;
  } while (pageToken);

  return rows;
}

/**
 * 取得結果を出力シートに書き込む。シートが無ければ作成し、既存内容はクリアする。
 */
function writeSlidesToSheet_(rows: SlideRow[]): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet =
    ss.getSheetByName(SLIDE_OUTPUT_SHEET_NAME) ??
    ss.insertSheet(SLIDE_OUTPUT_SHEET_NAME);
  sheet.clearContents();

  const header = ['種別', 'ファイル名', 'ID'];
  sheet.getRange(1, 1, 1, header.length).setValues([header]);

  if (rows.length > 0) {
    // 二次元配列にまとめて1回のsetValuesで書き込む
    const values = rows.map(row => [row.type, row.name, row.id]);
    sheet.getRange(2, 1, values.length, header.length).setValues(values);
  }
}
