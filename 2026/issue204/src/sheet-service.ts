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
// スプレッドシート操作（GAS API に依存する部分）
import {
  AUTO_COLUMNS_PROTECTION_DESCRIPTION,
  DATE_FORMAT,
  END_DATE_HELP_TEXT,
  LEGACY_PROTECTION_DESCRIPTIONS,
  MISSING_START_BACKGROUND,
  README_SHEET_NAME,
  README_URL,
  RESEARCH_SYSTEM_URL_DUMMY,
  RESEARCH_SYSTEM_URL_PROPERTY,
  TRIAL_COLORS,
  TRIAL_DISPLAY_NAME_COLUMN,
  TRIAL_TIMELINE_END_COLUMN,
  TRIAL_TIMELINE_START_COLUMN,
  TRIAL_END_COLUMN,
  TRIAL_INFO_DATE_FIRST_COLUMN,
  TRIAL_INFO_DATE_LAST_COLUMN,
  TRIAL_INFO_SHEET_NAME,
  TRIAL_MASTER_HEADERS,
  TRIAL_MASTER_SHEET_NAME,
  TRIAL_NAME_COLUMN,
  TRIAL_START_COLUMN,
  TRIAL_VISIBILITY_COLUMN,
  VISIBILITY_HIDDEN,
  VISIBILITY_SHOWN,
} from './constants';
import {
  buildDisplayNameFormula_,
  buildMissingStartCondition_,
  buildTimelineEndFormula_,
  buildTimelineStartFormula_,
  buildTrialInfoFormula_,
} from './formula-builder';
import {pickTrialColor_} from './schedule-logic';

type Sheet = GoogleAppsScript.Spreadsheet.Sheet;
type Spreadsheet = GoogleAppsScript.Spreadsheet.Spreadsheet;

// ---- 共通 ----

/**
 * 指定名のシートを取得する。存在しなければ作成する。
 */
function getOrCreateSheet_(ss: Spreadsheet, name: string): Sheet {
  return ss.getSheetByName(name) ?? ss.insertSheet(name);
}

/**
 * ヘッダー行を除いた、指定列（から width 列分）の最終行までの範囲を返す（入力規則・書式の設定用）。
 */
function getColumnBody_(sheet: Sheet, column: number, width = 1) {
  return sheet.getRange(2, column, sheet.getMaxRows() - 1, width);
}

// ---- 初期設定 ----

/**
 * 研究管理システムのURLをスクリプトプロパティから取得する。
 * 未設定ならダミー値を設定して返す（設定すべきプロパティがエディタ上で分かるようにするため）。
 */
function getResearchSystemUrl_(): string {
  const properties = PropertiesService.getScriptProperties();
  const url = properties.getProperty(RESEARCH_SYSTEM_URL_PROPERTY);
  if (url) {
    return url;
  }
  properties.setProperty(
    RESEARCH_SYSTEM_URL_PROPERTY,
    RESEARCH_SYSTEM_URL_DUMMY,
  );
  return RESEARCH_SYSTEM_URL_DUMMY;
}

/**
 * 試験情報マスタシートに、研究管理システムから取り込む数式を書き込む。
 * URL がダミー値のままなら書き込まずに設定を促す。
 */
function setupTrialInfoSheet_(ss: Spreadsheet): Sheet {
  const sheet = getOrCreateSheet_(ss, TRIAL_INFO_SHEET_NAME);
  const url = getResearchSystemUrl_();
  if (url === RESEARCH_SYSTEM_URL_DUMMY) {
    SpreadsheetApp.getUi().alert(
      `スクリプトプロパティ「${RESEARCH_SYSTEM_URL_PROPERTY}」に研究管理システムのURLを設定してから、もう一度「初期設定」を実行してください。`,
    );
    return sheet;
  }
  // QUERY の結果が展開される範囲に値が残っているとエラーになるため、シートを空にしてから書き込む
  sheet.clearContents();
  // Stat シートの取り込み・Datacenter シートの結合・並べ替えを1つの数式で行う
  sheet.getRange('A1').setFormula(buildTrialInfoFormula_(url));
  sheet.setFrozenRows(1);
  // FPI〜追跡終了の列を日付表示にする
  getColumnBody_(
    sheet,
    TRIAL_INFO_DATE_FIRST_COLUMN,
    TRIAL_INFO_DATE_LAST_COLUMN - TRIAL_INFO_DATE_FIRST_COLUMN + 1,
  ).setNumberFormat(DATE_FORMAT);
  return sheet;
}

/**
 * README へのリンクを置いたシートを、一番左に作成する。
 */
function setupReadmeSheet_(ss: Spreadsheet): void {
  const sheet = getOrCreateSheet_(ss, README_SHEET_NAME);
  sheet
    .getRange('A1')
    .setFormula(`=HYPERLINK("${README_URL}","README（使い方）")`);
  // 一番左に移動する（moveActiveSheet はアクティブなシートを動かすため、先にアクティブにする）
  ss.setActiveSheet(sheet);
  ss.moveActiveSheet(1);
}

/**
 * 試験一覧の自動計算の列（表示名〜タイムライン終了）に、編集しようとすると警告を表示する保護をかける（編集自体は可能）。
 * 初期設定を再実行しても重複しないよう、以前にかけた同じ保護（以前の版の保護を含む）は外してからかけ直す。
 */
function protectAutoColumns_(sheet: Sheet): void {
  const descriptions = [
    AUTO_COLUMNS_PROTECTION_DESCRIPTION,
    ...LEGACY_PROTECTION_DESCRIPTIONS,
  ];
  sheet
    .getProtections(SpreadsheetApp.ProtectionType.RANGE)
    .filter(protection => descriptions.includes(protection.getDescription()))
    .forEach(protection => protection.remove());
  sheet
    .getRange(
      1,
      TRIAL_DISPLAY_NAME_COLUMN,
      sheet.getMaxRows(),
      TRIAL_TIMELINE_END_COLUMN - TRIAL_DISPLAY_NAME_COLUMN + 1,
    )
    .protect()
    .setDescription(AUTO_COLUMNS_PROTECTION_DESCRIPTION)
    .setWarningOnly(true);
}

/**
 * 試験名があり非表示でないのに開始日が空欄のとき、開始日のセルに色を付ける条件付き書式を設定する。
 * 初期設定を再実行しても重複しないよう、同じ数式の既存ルールは置き換える。
 */
function highlightMissingStart_(sheet: Sheet): void {
  const condition = buildMissingStartCondition_();
  const rules = sheet
    .getConditionalFormatRules()
    .filter(
      rule => rule.getBooleanCondition()?.getCriteriaValues()[0] !== condition,
    );
  rules.push(
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(condition)
      .setBackground(MISSING_START_BACKGROUND)
      .setRanges([getColumnBody_(sheet, TRIAL_START_COLUMN)])
      .build(),
  );
  sheet.setConditionalFormatRules(rules);
}

/**
 * 以前の版で2行目に入れていた ARRAYFORMULA が残っていれば、その列の2行目以降を空にする。
 * （列の構成を変えたため、手入力の列や使わなくなった列に古い数式が残らないようにする）
 */
function clearLegacyArrayFormula_(sheet: Sheet, column: number): void {
  if (sheet.getRange(2, column).getFormula().startsWith('=ARRAYFORMULA')) {
    getColumnBody_(sheet, column).clearContent();
  }
}

/**
 * 試験一覧シートを作成し、ヘッダー・入力規則・自動計算の列（表示名〜タイムライン終了）の数式を設定する。
 * 既に入力されたデータは上書きしない（ヘッダーと自動計算の列の数式は設定し直す）。
 */
function setupTrialSheet_(ss: Spreadsheet, trialInfo: Sheet): void {
  const sheet = getOrCreateSheet_(ss, TRIAL_MASTER_SHEET_NAME);
  sheet
    .getRange(1, 1, 1, TRIAL_MASTER_HEADERS.length)
    .setValues([TRIAL_MASTER_HEADERS])
    .setFontWeight('bold');
  sheet.setFrozenRows(1);

  // 以前の版の数式が、手入力の終了日列や使わなくなった右側の列に残っていれば消す
  clearLegacyArrayFormula_(sheet, TRIAL_END_COLUMN);
  clearLegacyArrayFormula_(sheet, TRIAL_TIMELINE_END_COLUMN + 1);

  // 試験名は試験情報マスタのプロトコルIDを候補に出す（マスタにない値も入力できる）
  getColumnBody_(sheet, TRIAL_NAME_COLUMN).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInRange(trialInfo.getRange('A2:A'), true)
      .setAllowInvalid(true)
      .build(),
  );
  getColumnBody_(sheet, TRIAL_VISIBILITY_COLUMN).setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList([VISIBILITY_SHOWN, VISIBILITY_HIDDEN])
      .setAllowInvalid(false)
      .build(),
  );
  // 開始日・終了日は手入力の日付
  getColumnBody_(sheet, TRIAL_START_COLUMN)
    .setNumberFormat(DATE_FORMAT)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireDate()
        .setAllowInvalid(false)
        .build(),
    );
  // 終了日は任意入力。セルを選んだときに、空欄のときの扱いを説明として表示する
  getColumnBody_(sheet, TRIAL_END_COLUMN)
    .setNumberFormat(DATE_FORMAT)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireDate()
        .setAllowInvalid(false)
        .setHelpText(END_DATE_HELP_TEXT)
        .build(),
    );
  getColumnBody_(
    sheet,
    TRIAL_TIMELINE_START_COLUMN,
    TRIAL_TIMELINE_END_COLUMN - TRIAL_TIMELINE_START_COLUMN + 1,
  ).setNumberFormat(DATE_FORMAT);

  // 表示名〜タイムライン終了は数式で自動計算する（ARRAYFORMULA が下に展開されるよう、2行目以降は空にしてから書き込む）
  const autoBody = getColumnBody_(
    sheet,
    TRIAL_DISPLAY_NAME_COLUMN,
    TRIAL_TIMELINE_END_COLUMN - TRIAL_DISPLAY_NAME_COLUMN + 1,
  );
  autoBody.clearContent();
  // 自動計算の列には入力規則を付けない（以前の版で付けた日付の入力規則が残っていれば外す）
  autoBody.clearDataValidations();
  sheet
    .getRange(2, TRIAL_DISPLAY_NAME_COLUMN)
    .setFormula(buildDisplayNameFormula_());
  sheet
    .getRange(2, TRIAL_TIMELINE_START_COLUMN)
    .setFormula(buildTimelineStartFormula_());
  sheet
    .getRange(2, TRIAL_TIMELINE_END_COLUMN)
    .setFormula(buildTimelineEndFormula_());
  protectAutoColumns_(sheet);

  // タイムライン用の列は普段見る必要がないので、列ごと非表示にする
  // （以前の版で非表示にした列が別の位置にあるため、右側の列をいったん表示してから非表示にし直す）
  sheet.showColumns(
    TRIAL_TIMELINE_START_COLUMN,
    sheet.getMaxColumns() - TRIAL_TIMELINE_START_COLUMN + 1,
  );
  sheet.hideColumns(
    TRIAL_TIMELINE_START_COLUMN,
    TRIAL_TIMELINE_END_COLUMN - TRIAL_TIMELINE_START_COLUMN + 1,
  );

  // 開始日が未入力の試験を目立たせる
  highlightMissingStart_(sheet);

  // 既に入力済みの試験名にも色を付ける
  colorTrialNames_(sheet, 2, sheet.getMaxRows() - 1);
}

/**
 * README・試験情報マスタ・試験一覧の各シートを作成し、書式と数式を設定する。
 */
export function setupSheets_(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 日付計算がずれないよう、スクリプトと同じタイムゾーンに揃える
  ss.setSpreadsheetTimeZone('Asia/Tokyo');

  setupReadmeSheet_(ss);
  const trialInfo = setupTrialInfoSheet_(ss);
  setupTrialSheet_(ss, trialInfo);
}

// ---- 編集時の処理 ----

/**
 * 試験名のセルのうち、まだ色が付いていないものに淡い色を付ける（タイムラインのバーの色になる）。
 * 既に色が付いているセル（手動で変えた色を含む）は変えない。
 */
function colorTrialNames_(sheet: Sheet, startRow: number, numRows: number) {
  const range = sheet.getRange(startRow, TRIAL_NAME_COLUMN, numRows, 1);
  const names = range.getValues();
  const backgrounds = range.getBackgrounds();
  let changed = false;
  const next = backgrounds.map((row, i) => {
    const color = pickTrialColor_(
      startRow + i,
      String(names[i][0]),
      row[0],
      TRIAL_COLORS,
    );
    if (color) {
      changed = true;
      return [color];
    }
    return row;
  });
  // 変更があるときだけまとめて書き込む
  if (changed) {
    range.setBackgrounds(next);
  }
}

/**
 * 試験一覧で試験名が入力されたとき、そのセルに淡い色を付ける。
 */
export function colorTrialNamesOnEdit_(
  e: GoogleAppsScript.Events.SheetsOnEdit,
): void {
  const range = e.range;
  const sheet = range.getSheet();
  if (sheet.getName() !== TRIAL_MASTER_SHEET_NAME) {
    return;
  }
  // 編集範囲が試験名の列（2行目以降）を含むときだけ処理する
  const lastRow = range.getLastRow();
  const firstRow = Math.max(range.getRow(), 2);
  if (
    lastRow < 2 ||
    range.getColumn() > TRIAL_NAME_COLUMN ||
    range.getLastColumn() < TRIAL_NAME_COLUMN
  ) {
    return;
  }
  colorTrialNames_(sheet, firstRow, lastRow - firstRow + 1);
}
