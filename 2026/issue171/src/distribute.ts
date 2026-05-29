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

import {
  C_INDEX,
  C_PREFIX,
  COLUMN_WIDTHS,
  COLUMN_WIDTHS_EXTERNAL,
  D_INDEX,
  DATE_SHEET_PATTERN,
  EXCLUDED_COLS,
  EXCLUDED_COLS_EXTERNAL,
  J_INDEX,
  J_VALUE_EXTERNAL,
  J_VALUE_MANAGED,
  KEY_COLS_OUT,
  PDF_FILE_NAME_PREFIX,
  PROP_PDF_FOLDER_ID,
  SHEET_NAME_EXTERNAL,
  SHEET_NAME_MANAGED,
  STATUS_COL_HEADER,
  STATUS_DELETED,
} from './constants';
import { exportSheetAsPdf_ } from './import-csv';

export function distributeByCategory_(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 日時形式のシート名のうち最新のものを取得
  const dateSheets = ss
    .getSheets()
    .filter(s => DATE_SHEET_PATTERN.test(s.getName()))
    .sort((a, b) => (a.getName() > b.getName() ? -1 : 1));

  if (dateSheets.length === 0) return;

  const source = dateSheets[0];
  const data = source.getDataRange().getValues() as string[][];

  if (data.length === 0) return;

  const body = sortByFolderPath_(data.slice(1));
  const sourceName = source.getName();

  writeToSheet_(
    ss,
    SHEET_NAME_MANAGED,
    transformRows_([data[0]])[0],
    transformRows_(body.filter(r => r[J_INDEX] === J_VALUE_MANAGED)),
    sourceName,
    COLUMN_WIDTHS
  );
  writeToSheet_(
    ss,
    SHEET_NAME_EXTERNAL,
    transformRows_([data[0]], EXCLUDED_COLS_EXTERNAL)[0],
    transformRows_(
      body.filter(r => r[J_INDEX] === J_VALUE_EXTERNAL),
      EXCLUDED_COLS_EXTERNAL
    ),
    sourceName,
    COLUMN_WIDTHS_EXTERNAL,
    true
  );

  // 外部一覧シートをPDF出力
  const pdfFolderId =
    PropertiesService.getScriptProperties().getProperty(PROP_PDF_FOLDER_ID);
  if (pdfFolderId) {
    const externalSheet = ss.getSheetByName(SHEET_NAME_EXTERNAL);
    if (externalSheet) {
      const dateStr = formatDateYmd_(new Date());
      exportSheetAsPdf_(
        ss,
        externalSheet,
        pdfFolderId,
        `collaborations_run_on_${sourceName}.csv`,
        `${PDF_FILE_NAME_PREFIX}${dateStr}.pdf`
      );
    }
  }
}

export function transformRows_(
  rows: string[][],
  excludedCols: ReadonlySet<number> = EXCLUDED_COLS
): string[][] {
  return rows.map(row => {
    const copy = [...row];
    if (copy[C_INDEX]?.startsWith(C_PREFIX)) {
      copy[C_INDEX] = copy[C_INDEX].slice(C_PREFIX.length);
    }
    return copy.filter((_, i) => !excludedCols.has(i));
  });
}

export function sortByFolderPath_(rows: string[][]): string[][] {
  return [...rows].sort((a, b) => {
    const aPath = a[D_INDEX].split('/').filter(Boolean);
    const bPath = b[D_INDEX].split('/').filter(Boolean);
    for (let i = 0; i < Math.min(aPath.length, bPath.length); i++) {
      if (aPath[i] < bPath[i]) return -1;
      if (aPath[i] > bPath[i]) return 1;
    }
    return aPath.length - bPath.length;
  });
}

export function findDeletedRows_(
  existingData: string[][],
  newRows: string[][],
  dataColCount: number,
  statusLabel: string
): string[][] {
  if (existingData.length <= 1) return [];

  const hasStatusCol = existingData[0].length > dataColCount;
  const existingBody = existingData.slice(1);

  // アクティブな既存行（削除済で始まらない行）
  const activeExisting = existingBody.filter(row =>
    hasStatusCol ? !(row[dataColCount] ?? '').startsWith(STATUS_DELETED) : true
  );

  // 新データのキーセット
  const newKeys = new Set(
    newRows.map(r => KEY_COLS_OUT.map(i => r[i] ?? '').join('\0'))
  );

  // 新データに存在しないアクティブ行 → 削除済として返す
  return activeExisting
    .filter(row => !newKeys.has(KEY_COLS_OUT.map(i => row[i] ?? '').join('\0')))
    .map(row => [...row.slice(0, dataColCount), statusLabel]);
}

function writeToSheet_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: string,
  header: string[],
  rows: string[][],
  sourceName: string,
  widths: readonly number[],
  wrapText = false
): void {
  const dataColCount = header.length;
  const statusLabel = `${STATUS_DELETED}（${sourceName}）`;
  let sheet = ss.getSheetByName(name);

  let prevDeleted: string[][] = [];
  let newlyDeleted: string[][] = [];

  if (sheet) {
    const existingData = sheet.getDataRange().getValues() as string[][];
    // 既存の削除済行を引き継ぐ
    if (existingData.length > 1 && existingData[0].length > dataColCount) {
      prevDeleted = existingData
        .slice(1)
        .filter(row => (row[dataColCount] ?? '').startsWith(STATUS_DELETED))
        .map(row => [...row.slice(0, dataColCount), row[dataColCount]]);
    }
    // 今回の新データで消えた行を検出
    newlyDeleted = findDeletedRows_(
      existingData,
      rows,
      dataColCount,
      statusLabel
    );
    sheet.clearContents();
  } else {
    sheet = ss.insertSheet(name);
  }

  const fullHeader = [...header, STATUS_COL_HEADER];
  const activeRows = rows.map(r => [...r, '']);
  const allRows = [fullHeader, ...activeRows, ...prevDeleted, ...newlyDeleted];

  const dataRange = sheet.getRange(1, 1, allRows.length, fullHeader.length);
  dataRange.setValues(allRows);
  if (wrapText) {
    dataRange.setWrap(true);
  }
  sheet.setFrozenRows(1);
  resizeColumns_(sheet, fullHeader.length, widths);
}

export function resizeColumns_(
  sheet: GoogleAppsScript.Spreadsheet.Sheet,
  colCount: number,
  widths: readonly number[]
): void {
  // 幅の指定がない場合は全列一括で自動調整
  if (widths.length === 0) {
    sheet.autoResizeColumns(1, colCount);
    return;
  }
  for (let i = 0; i < colCount; i++) {
    const width = widths[i] ?? 0;
    if (width > 0) {
      sheet.setColumnWidth(i + 1, width);
    } else {
      sheet.autoResizeColumn(i + 1);
    }
  }
}

/** JST の YYYYMMDD 形式で日付文字列を返す */
export function formatDateYmd_(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  // JST = UTC+9
  const jst = new Date(date.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCFullYear()}${pad(jst.getUTCMonth() + 1)}${pad(jst.getUTCDate())}`;
}
