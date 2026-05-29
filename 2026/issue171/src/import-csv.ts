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

import { FILE_PATTERN } from './constants';

interface CsvFileEntry {
  page: number;
  file: GoogleAppsScript.Drive.File;
}

export function importCsvFiles_(): void {
  const folderId =
    PropertiesService.getScriptProperties().getProperty('FOLDER_ID');
  if (!folderId) {
    throw new Error('スクリプトプロパティ FOLDER_ID が設定されていません');
  }

  const folder = DriveApp.getFolderById(folderId);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const existingSheetNames = new Set(ss.getSheets().map(s => s.getName()));

  // ファイルを収集してシート名（日時）ごとにグループ化
  const groups: Record<string, CsvFileEntry[]> = {};
  const files = folder.getFiles();

  while (files.hasNext()) {
    const file = files.next();
    const match = file.getName().match(FILE_PATTERN);
    if (!match) continue;

    const sheetName = match[1];
    const page = parseInt(match[2], 10);

    if (!groups[sheetName]) groups[sheetName] = [];
    groups[sheetName].push({ page, file });
  }

  // 日時の昇順で処理
  for (const sheetName of Object.keys(groups).sort()) {
    // 出力済みのシートはスキップ
    if (existingSheetNames.has(sheetName)) continue;

    const entries = groups[sheetName].sort((a, b) => a.page - b.page);
    const sheet = ss.insertSheet(sheetName);
    let startRow = 1;

    for (const { page, file } of entries) {
      const content = file.getBlob().getDataAsString('UTF-8');
      const rows = Utilities.parseCsv(content);
      if (rows.length === 0) continue;

      // 2ページ目以降はヘッダー行をスキップ
      const dataRows = page === 1 ? rows : rows.slice(1);
      if (dataRows.length === 0) continue;

      const colCount = Math.max(...dataRows.map(r => r.length));
      // setValues は全行の列数が一致している必要があるため正規化
      const normalized = dataRows.map(r =>
        r.length < colCount
          ? [...r, ...new Array(colCount - r.length).fill('')]
          : r
      );

      sheet
        .getRange(startRow, 1, normalized.length, colCount)
        .setValues(normalized);
      startRow += normalized.length;
    }
  }
}
