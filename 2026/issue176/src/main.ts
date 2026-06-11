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

const PROP_INPUT_FILE1_ID = 'INPUT_FILE1_ID';
const PROP_INPUT_FILE2_ID = 'INPUT_FILE2_ID';
const SHEET_FORM_ANSWERS = 'フォームの回答 2';
const SHEET_EXTERNAL_LIST = '外部一覧';
const SHEET_DIR_MAP = 'ディレクトリ対応表';
const SHEET_EMAIL_MAP = 'メールアドレス対応表';
const SHEET_SPLIT_MAP = '分割対応表';
const SHEET_JOINED = '結合結果';
const SHEET_UNMATCHED = '未結合';
const SHEET_COPY_INFO = 'コピー用情報';
const COL_DELETE_INDEX = 15; // P列 (0-indexed)
const COL_PATH_INDEX = 11; // L列 (0-indexed)
const COL_FORM_J_INDEX = 9; // J列 (0-indexed)
const COL_EXTERNAL_A_INDEX = 0; // 外部一覧 A列 (0-indexed)
const COL_EXTERNAL_D_INDEX = 3; // 外部一覧 D列 (0-indexed)

function getSheetOrThrow_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`シート "${sheetName}" が見つかりません: ${ss.getId()}`);
  }
  return sheet;
}

function getOrCreateSheet_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string
): GoogleAppsScript.Spreadsheet.Sheet {
  const existing = ss.getSheetByName(sheetName);
  if (existing) {
    existing.clearContents();
    return existing;
  }
  return ss.insertSheet(sheetName);
}

/**
 * 必要なスクリプトプロパティをダミー値で登録する初期処理
 */
export function initProperties_(): void {
  const props = PropertiesService.getScriptProperties();
  const defaults: Record<string, string> = {
    [PROP_INPUT_FILE1_ID]: 'YOUR_INPUT_FILE1_SPREADSHEET_ID',
    [PROP_INPUT_FILE2_ID]: 'YOUR_INPUT_FILE2_SPREADSHEET_ID',
  };
  props.setProperties(defaults, true);
  Logger.log(
    'スクリプトプロパティを初期化しました: %s',
    JSON.stringify(defaults)
  );
}

/**
 * データ取込処理: 入力ファイルからデータを読み込みアクティブスプレッドシートに出力する
 */
export function importData_(): void {
  const props = PropertiesService.getScriptProperties();
  const file1Id = props.getProperty(PROP_INPUT_FILE1_ID);
  const file2Id = props.getProperty(PROP_INPUT_FILE2_ID);

  if (!file1Id)
    throw new Error(
      `スクリプトプロパティ "${PROP_INPUT_FILE1_ID}" が設定されていません`
    );
  if (!file2Id)
    throw new Error(
      `スクリプトプロパティ "${PROP_INPUT_FILE2_ID}" が設定されていません`
    );

  let inputSs1: GoogleAppsScript.Spreadsheet.Spreadsheet;
  let inputSs2: GoogleAppsScript.Spreadsheet.Spreadsheet;

  try {
    inputSs1 = SpreadsheetApp.openById(file1Id);
  } catch {
    throw new Error(`入力ファイル1 (ID: ${file1Id}) を開けませんでした`);
  }

  try {
    inputSs2 = SpreadsheetApp.openById(file2Id);
  } catch {
    throw new Error(`入力ファイル2 (ID: ${file2Id}) を開けませんでした`);
  }

  const inputFormSheet = getSheetOrThrow_(inputSs1, SHEET_FORM_ANSWERS);
  const inputExternalSheet = getSheetOrThrow_(inputSs2, SHEET_EXTERNAL_LIST);

  const activeSs = SpreadsheetApp.getActiveSpreadsheet();
  const outputFormSheet = getOrCreateSheet_(activeSs, SHEET_FORM_ANSWERS);
  const outputExternalSheet = getOrCreateSheet_(activeSs, SHEET_EXTERNAL_LIST);

  // 「フォームの回答 2」: P列に「削除」がない行のみ出力（1行目は必ず出力）
  const formData = inputFormSheet.getDataRange().getValues();
  const filteredFormData = formData.filter((row, index) => {
    if (index === 0) return true; // 見出し行は必ず含める
    return !String(row[COL_DELETE_INDEX]).includes('削除');
  });
  if (filteredFormData.length > 0) {
    outputFormSheet
      .getRange(1, 1, filteredFormData.length, filteredFormData[0].length)
      .setValues(filteredFormData);
  }

  // L列の行分割処理（置換より前に実行）
  splitRowsByPathColumn_(activeSs, outputFormSheet);

  // J列のメールアドレス置換処理
  replaceEmailColumn_(activeSs, outputFormSheet);

  // L列の置換処理
  replacePathColumn_(activeSs, outputFormSheet, filteredFormData);

  // 「外部一覧」: そのまま出力
  const externalData = inputExternalSheet.getDataRange().getValues();
  if (externalData.length > 0) {
    outputExternalSheet
      .getRange(1, 1, externalData.length, externalData[0].length)
      .setValues(externalData);
  }

  Logger.log('処理完了');
}

/**
 * 分割対応表を読み込み、「フォームの回答 2」シートのL列が
 * 分割対象文字列と一致する行を2行に分割する処理
 */
function splitRowsByPathColumn_(
  activeSs: GoogleAppsScript.Spreadsheet.Spreadsheet,
  formSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  const splitMapSheet = getSheetOrThrow_(activeSs, SHEET_SPLIT_MAP);

  // 分割対応表を取得（1行目は見出し）
  const splitMapData = splitMapSheet.getDataRange().getValues();
  const splitRules = splitMapData
    .slice(1)
    .filter(row => String(row[0]).trim() !== '')
    .map(row => ({
      target: String(row[0]),
      line1: String(row[1]),
      line2: String(row[2]),
    }));

  if (splitRules.length === 0) return;

  // シートの全データを取得（1行目は見出し）
  const lastRow = formSheet.getLastRow();
  if (lastRow < 2) return;

  const numCols = formSheet.getLastColumn();
  const dataRange = formSheet.getRange(2, 1, lastRow - 1, numCols);
  const data = dataRange.getValues();

  // 分割後のデータを構築
  const newData: unknown[][] = [];
  for (const row of data) {
    const cellL = String(row[COL_PATH_INDEX]);
    const rule = splitRules.find(r => r.target === cellL);
    if (rule) {
      // 1行目: L列をline1に置き換え
      const row1 = [...row];
      row1[COL_PATH_INDEX] = rule.line1;
      newData.push(row1);
      // 2行目: L列をline2に置き換え
      const row2 = [...row];
      row2[COL_PATH_INDEX] = rule.line2;
      newData.push(row2);
    } else {
      newData.push(row);
    }
  }

  // シートのデータ行をクリアして書き直し
  formSheet.getRange(2, 1, lastRow - 1, numCols).clearContent();
  if (newData.length > 0) {
    // 行数が増える場合は行を追加
    const neededRows = newData.length + 1; // +1 for header
    if (formSheet.getMaxRows() < neededRows) {
      formSheet.insertRowsAfter(
        formSheet.getMaxRows(),
        neededRows - formSheet.getMaxRows()
      );
    }
    formSheet.getRange(2, 1, newData.length, numCols).setValues(newData);
  }
}

/**
 * アクティブスプレッドシートのディレクトリ対応表を読み込み、
 * 「フォームの回答 2」シートのL列を置換する処理
 */
function replacePathColumn_(
  activeSs: GoogleAppsScript.Spreadsheet.Spreadsheet,
  formSheet: GoogleAppsScript.Spreadsheet.Sheet,
  formData: unknown[][]
): void {
  const dirMapSheet = getSheetOrThrow_(activeSs, SHEET_DIR_MAP);

  // ディレクトリ対応表を取得（1行目は見出し）
  const dirMapData = dirMapSheet.getDataRange().getValues();
  // データ行のみ（見出し除く）
  // セル内改行を \n に統一してから置換マップを作成
  const normalizeNewline = (s: string) => s.replace(/\r\n/g, '\n');
  const replacements = dirMapData
    .slice(1)
    .filter(row => String(row[0]).trim() !== '')
    .map(row => ({
      from: normalizeNewline(String(row[0])),
      to: normalizeNewline(String(row[1])),
    }));

  // データがない場合はスキップ
  if (replacements.length === 0) {
    Logger.log('ディレクトリ対応表にデータがないため置換処理をスキップします');
    return;
  }

  // 出力済みのL列を更新（1行目は見出しなのでスキップ）
  const lastRow = formSheet.getLastRow();
  if (lastRow < 2) return;

  const colL = formSheet.getRange(2, COL_PATH_INDEX + 1, lastRow - 1, 1);
  const values = colL.getValues();

  for (let i = 0; i < values.length; i++) {
    // セル内改行を \n に統一
    let cell = normalizeNewline(String(values[i][0]));

    // ディレクトリ対応表による置換
    for (const rep of replacements) {
      cell = cell.split(rep.from).join(rep.to);
    }

    // \ を / に置換
    cell = cell.replace(/\\/g, '/');

    // 先頭の /Box/ または Box/ を大文字小文字問わず削除
    cell = cell.replace(/^\/box\//i, '').replace(/^box\//i, '');

    // " を削除
    cell = cell.replace(/"/g, '');

    // box.com の URL を削除
    cell = cell.replace(/https?:\/\/[^\s\n]+\.box\.com[^\s\n]*/gi, '');

    // セル内の空行を削除
    cell = cell
      .split('\n')
      .filter(line => line.trim() !== '')
      .join('\n');

    // 前後の空白を除去
    cell = cell.trim();
    // 末尾が / でなければ / を追加
    if (cell.length > 0 && !cell.endsWith('/')) {
      cell += '/';
    }

    values[i][0] = cell;
  }

  colL.setValues(values);
}

/**
 * メールアドレス対応表を読み込み、「フォームの回答 2」シートのJ列を置換する処理
 */
function replaceEmailColumn_(
  activeSs: GoogleAppsScript.Spreadsheet.Spreadsheet,
  formSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  const emailMapSheet = getSheetOrThrow_(activeSs, SHEET_EMAIL_MAP);

  // メールアドレス対応表を取得（1行目は見出し）
  const emailMapData = emailMapSheet.getDataRange().getValues();
  const replacements = emailMapData
    .slice(1)
    .filter(row => String(row[0]).trim() !== '')
    .map(row => ({ from: String(row[0]), to: String(row[1]) }));

  // データがない場合はスキップ
  if (replacements.length === 0) {
    Logger.log(
      'メールアドレス対応表にデータがないため置換処理をスキップします'
    );
    return;
  }

  // J列を更新（1行目は見出しなのでスキップ）
  const lastRow = formSheet.getLastRow();
  if (lastRow < 2) return;

  const colJ = formSheet.getRange(2, COL_FORM_J_INDEX + 1, lastRow - 1, 1);
  const values = colJ.getValues();

  for (let i = 0; i < values.length; i++) {
    let cell = String(values[i][0]);
    for (const rep of replacements) {
      cell = cell.split(rep.from).join(rep.to);
    }
    values[i][0] = cell;
  }

  colJ.setValues(values);
}

/**
 * 結合処理: 「フォームの回答 2」と「外部一覧」を inner join し結果を出力する。
 * 結合キー: フォームの回答 2.L列 == 外部一覧.A列 AND フォームの回答 2.J列 == 外部一覧.D列
 * - 一致した行 → 「結合結果」シート（フォームの回答 2 の全列 + 外部一覧の全列）
 * - 一致しなかった行 → 「未結合」シート（フォームの回答 2 / 外部一覧それぞれの行をそのまま出力）
 */
export function joinData_(): void {
  const activeSs = SpreadsheetApp.getActiveSpreadsheet();
  const formSheet = getSheetOrThrow_(activeSs, SHEET_FORM_ANSWERS);
  const externalSheet = getSheetOrThrow_(activeSs, SHEET_EXTERNAL_LIST);

  const formAllData = formSheet.getDataRange().getValues();
  const externalAllData = externalSheet.getDataRange().getValues();

  const formHeader = formAllData[0];
  const externalHeader = externalAllData[0];
  const formRows = formAllData.slice(1);
  const externalRows = externalAllData.slice(1);

  // 結合済みシート準備
  const joinedSheet = getOrCreateSheet_(activeSs, SHEET_JOINED);
  const unmatchedSheet = getOrCreateSheet_(activeSs, SHEET_UNMATCHED);

  // 結合結果の見出し: フォームの回答 2 全列 + 外部一覧全列
  joinedSheet
    .getRange(1, 1, 1, formHeader.length + externalHeader.length)
    .setValues([[...formHeader, ...externalHeader]]);

  // 未結合の見出し: シート名列 + 各シートの列
  const unmatchedFormColCount = formHeader.length;
  const unmatchedExternalColCount = externalHeader.length;
  const unmatchedColCount =
    1 + Math.max(unmatchedFormColCount, unmatchedExternalColCount);
  unmatchedSheet
    .getRange(1, 1, 1, unmatchedColCount)
    .setValues([
      [
        '元シート',
        ...formHeader,
        ...new Array(unmatchedColCount - 1 - formHeader.length).fill(''),
      ],
    ]);

  // 外部一覧をキー(A列, D列)でインデックス化
  const externalIndexed = new Map<
    string,
    { row: unknown[]; used: boolean }[]
  >();
  for (const row of externalRows) {
    const key = `${String(row[COL_EXTERNAL_A_INDEX])}\0${String(row[COL_EXTERNAL_D_INDEX])}`;
    if (!externalIndexed.has(key)) externalIndexed.set(key, []);
    externalIndexed.get(key)!.push({ row, used: false });
  }

  const joinedData: unknown[][] = [];
  const unmatchedData: unknown[][] = [];

  // フォームの回答 2 を走査
  for (const formRow of formRows) {
    const key = `${String(formRow[COL_PATH_INDEX])}\0${String(formRow[COL_FORM_J_INDEX])}`;
    const matches = externalIndexed.get(key);
    if (matches && matches.length > 0) {
      // 最初の未使用エントリと結合
      const match = matches.find(m => !m.used) ?? matches[0];
      match.used = true;
      joinedData.push([...formRow, ...match.row]);
    } else {
      // 未結合（フォームの回答 2 側）
      unmatchedData.push(['フォームの回答 2', ...formRow]);
    }
  }

  // 外部一覧で未使用のものを未結合へ
  for (const entries of externalIndexed.values()) {
    for (const entry of entries) {
      if (!entry.used) {
        const padded = new Array(unmatchedColCount - 1 - entry.row.length).fill(
          ''
        );
        unmatchedData.push(['外部一覧', ...entry.row, ...padded]);
      }
    }
  }

  // 結合結果を出力
  if (joinedData.length > 0) {
    joinedSheet
      .getRange(
        2,
        1,
        joinedData.length,
        formHeader.length + externalHeader.length
      )
      .setValues(joinedData);
  }

  // 未結合を出力
  if (unmatchedData.length > 0) {
    unmatchedSheet
      .getRange(2, 1, unmatchedData.length, unmatchedColCount)
      .setValues(unmatchedData);
  }

  Logger.log(
    '結合処理完了: 結合 %d 行, 未結合 %d 行',
    joinedData.length,
    unmatchedData.length
  );
}

/**
 * コピー用情報出力処理: 結合結果シートからコピー用情報シートを生成する。
 *
 * 出力列マッピング (結合結果シートは 0-indexed):
 *   A, B, C → 空白
 *   D       → 結合結果 B列 (1)
 *   E, F    → 結合結果 C列 (2) + D列 (3) を結合
 *   G       → 結合結果 B列 (1)
 *   H       → 結合結果 E列 (4)
 *   I       → 結合結果 L列 (11)
 *   J       → 結合結果 G列 (6) + H列 (7) を結合
 *   K       → 結合結果 I列 (8)
 *   L       → 結合結果 J列 (9)
 *   M       → 結合結果 F列 (5)
 *   N       → 結合結果 K列 (10)
 *   O       → 結合結果 M列 (12)
 *   P       → 結合結果 O列 (14)
 *   Q       → 結合結果 N列 (13)
 */
export function createCopyInfo_(): void {
  const activeSs = SpreadsheetApp.getActiveSpreadsheet();
  const joinedSheet = getSheetOrThrow_(activeSs, SHEET_JOINED);
  const copyInfoSheet = getOrCreateSheet_(activeSs, SHEET_COPY_INFO);

  const joinedAllData = joinedSheet.getDataRange().getValues();
  // 1行目は見出しなので除外
  const dataRows = joinedAllData.slice(1);

  if (dataRows.length === 0) {
    Logger.log('結合結果シートにデータがありません');
    return;
  }

  const outputRows: unknown[][] = dataRows.map(r => {
    const cd = String(r[2]) + String(r[3]); // C列+D列
    const gh = String(r[6]) + String(r[7]); // G列+H列
    return [
      '',
      '',
      '', // A, B, C
      r[1], // D ← B列
      cd, // E ← C+D
      cd, // F ← C+D
      r[1], // G ← B列
      r[4], // H ← E列
      r[11], // I ← L列
      gh, // J ← G+H
      r[8], // K ← I列
      r[9], // L ← J列
      r[5], // M ← F列
      r[10], // N ← K列
      r[12], // O ← M列
      r[14], // P ← O列
      r[13], // Q ← N列
    ];
  });

  copyInfoSheet.getRange(1, 1, outputRows.length, 17).setValues(outputRows);

  Logger.log('コピー用情報出力完了: %d 行', outputRows.length);
}
