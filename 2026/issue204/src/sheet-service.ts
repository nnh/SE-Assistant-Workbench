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
  DATE_FORMAT,
  EVENT_BACKGROUND,
  DEFAULT_EVENTS,
  DEFAULT_TASK_TEMPLATES,
  EVENT_DATE_COLUMN,
  EVENT_HEADERS,
  EVENT_MASTER_HEADERS,
  EVENT_MASTER_SHEET_NAME,
  EVENT_NAME_COLUMN,
  EVENT_ROUND_COLUMN,
  EVENT_SHEET_NAME,
  EVENT_TRIAL_COLUMN,
  README_SHEET_NAME,
  README_URL,
  RESEARCH_SYSTEM_URL_DUMMY,
  RESEARCH_SYSTEM_URL_PROPERTY,
  SCHEDULE_BASE_COLUMN,
  SCHEDULE_HEADERS,
  SCHEDULE_INPUT_WIDTH,
  SCHEDULE_ORDER_COLUMN,
  SCHEDULE_OUTPUT_WIDTH,
  SCHEDULE_PERIOD_COLUMN,
  SCHEDULE_ROUND_COLUMN,
  SCHEDULE_SHEET_NAME,
  SCHEDULE_START_COLUMN,
  SCHEDULE_TASK_COLUMN,
  SCHEDULE_TRIAL_COLUMN,
  SCHEDULE_UNIT_COLUMN,
  TASK_BACKGROUND,
  TASK_TEMPLATE_HEADERS,
  TASK_TEMPLATE_SHEET_NAME,
  TIMELINE_HEADERS,
  TIMELINE_SHEET_NAME,
  TRIAL_DATA_LOCK_COLUMN,
  TRIAL_INFO_DATE_FIRST_COLUMN,
  TRIAL_INFO_DATE_LAST_COLUMN,
  TRIAL_INFO_SHEET_NAME,
  TRIAL_LPO_COLUMN,
  TRIAL_MASTER_HEADERS,
  TRIAL_MASTER_SHEET_NAME,
  TRIAL_NAME_COLUMN,
  TRIAL_VISIBILITY_COLUMN,
  UNIT_PERSON_DAY,
  UNIT_PERSON_MONTH,
  VISIBILITY_HIDDEN,
  VISIBILITY_SHOWN,
} from './constants';
import {buildTrialInfoFormula_} from './formula-builder';
import {
  buildBaseOptions_,
  buildTimelineRows_,
  EventRow,
  findHiddenRowRuns_,
  findMissingTaskRows_,
  isDate_,
  scheduleTrialTasks_,
  TaskDates,
  TaskRow,
  TaskTemplate,
  Trial,
} from './schedule-logic';

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
 * シートが空ならヘッダー行（と初期データ）を書き込む。既に内容があるシートは上書きしない。
 */
function writeHeaderIfEmpty_(
  sheet: Sheet,
  headers: string[],
  initialRows: (string | number)[][] = [],
): void {
  if (sheet.getLastRow() !== 0) {
    return;
  }
  sheet
    .getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold');
  if (initialRows.length > 0) {
    sheet
      .getRange(2, 1, initialRows.length, headers.length)
      .setValues(initialRows);
  }
  sheet.setFrozenRows(1);
}

/**
 * ヘッダー行を除いた、指定列（から width 列分）の最終行までの範囲を返す（入力規則・書式の設定用）。
 */
function getColumnBody_(sheet: Sheet, column: number, width = 1) {
  return sheet.getRange(2, column, sheet.getMaxRows() - 1, width);
}

/**
 * ヘッダー行を除いたデータ行をまとめて読み込む（空のシートなら空配列）。
 */
function readBody_(sheet: Sheet | null): unknown[][] {
  if (!sheet || sheet.getLastRow() < 2) {
    return [];
  }
  return sheet.getDataRange().getValues().slice(1);
}

/**
 * 選択肢から選ぶ入力規則を設定する。
 */
function setListValidation_(
  range: GoogleAppsScript.Spreadsheet.Range,
  values: string[],
): void {
  range.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(values)
      .setAllowInvalid(false)
      .build(),
  );
}

/**
 * 別シートの範囲から選ぶプルダウンの入力規則を設定する。
 */
function setRangeValidation_(
  range: GoogleAppsScript.Spreadsheet.Range,
  source: GoogleAppsScript.Spreadsheet.Range,
  allowInvalid: boolean,
): void {
  range.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInRange(source, true)
      .setAllowInvalid(allowInvalid)
      .build(),
  );
}

/**
 * 日付の入力規則と表示形式を設定する。
 */
function setDateValidation_(range: GoogleAppsScript.Spreadsheet.Range): void {
  range
    .setNumberFormat(DATE_FORMAT)
    .setDataValidation(
      SpreadsheetApp.newDataValidation()
        .requireDate()
        .setAllowInvalid(false)
        .build(),
    );
}

/**
 * 回（1以上の数）の入力規則を設定する。
 */
function setRoundValidation_(range: GoogleAppsScript.Spreadsheet.Range): void {
  range.setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireNumberGreaterThanOrEqualTo(1)
      .setAllowInvalid(false)
      .build(),
  );
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
 * 各シートを作成し、ヘッダー・初期データ・入力規則を設定する。
 * 既に内容があるシートのデータは上書きしない（入力規則・書式は設定し直す）。
 */
export function setupSheets_(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 日付計算がずれないよう、スクリプトと同じタイムゾーンに揃える
  ss.setSpreadsheetTimeZone('Asia/Tokyo');

  // README へのリンク
  setupReadmeSheet_(ss);

  // 試験情報マスタ（研究管理システムから取り込み）
  const trialInfo = setupTrialInfoSheet_(ss);

  // 試験一覧
  const trials = getOrCreateSheet_(ss, TRIAL_MASTER_SHEET_NAME);
  writeHeaderIfEmpty_(trials, TRIAL_MASTER_HEADERS);
  // 略称は試験情報マスタのプロトコルIDを候補に出す（マスタにない値も入力できる）
  setRangeValidation_(
    getColumnBody_(trials, TRIAL_NAME_COLUMN),
    trialInfo.getRange('A2:A'),
    true,
  );
  setListValidation_(getColumnBody_(trials, TRIAL_VISIBILITY_COLUMN), [
    VISIBILITY_SHOWN,
    VISIBILITY_HIDDEN,
  ]);
  setDateValidation_(getColumnBody_(trials, TRIAL_LPO_COLUMN, 2));

  // イベント一覧（基準の選択肢にも使うため先に作る）
  const eventMaster = getOrCreateSheet_(ss, EVENT_MASTER_SHEET_NAME);
  writeHeaderIfEmpty_(
    eventMaster,
    EVENT_MASTER_HEADERS,
    DEFAULT_EVENTS.map(name => [name]),
  );
  // 基準の選択肢（LPO・データロック・イベント一覧の各イベントに「前」「後」を付けたもの）
  const baseOptions = buildBaseOptions_(
    readBody_(eventMaster)
      .map(row => String(row[0]))
      .filter(name => name !== ''),
  );

  // 作業テンプレート
  const templates = getOrCreateSheet_(ss, TASK_TEMPLATE_SHEET_NAME);
  writeHeaderIfEmpty_(templates, TASK_TEMPLATE_HEADERS, DEFAULT_TASK_TEMPLATES);
  setListValidation_(getColumnBody_(templates, 2), baseOptions);
  setListValidation_(getColumnBody_(templates, 5), [
    UNIT_PERSON_DAY,
    UNIT_PERSON_MONTH,
  ]);

  // スケジュール（作業ごとの期間。開始日〜警告は自動計算）
  const schedule = getOrCreateSheet_(ss, SCHEDULE_SHEET_NAME);
  writeHeaderIfEmpty_(schedule, SCHEDULE_HEADERS);
  setRangeValidation_(
    getColumnBody_(schedule, SCHEDULE_TRIAL_COLUMN),
    trials.getRange('A2:A'),
    false,
  );
  setRangeValidation_(
    getColumnBody_(schedule, SCHEDULE_TASK_COLUMN),
    templates.getRange('A2:A'),
    // 作業テンプレートにない作業も入力できる（警告表示のみ）
    true,
  );
  setRoundValidation_(getColumnBody_(schedule, SCHEDULE_ROUND_COLUMN));
  setListValidation_(
    getColumnBody_(schedule, SCHEDULE_BASE_COLUMN),
    baseOptions,
  );
  setListValidation_(getColumnBody_(schedule, SCHEDULE_UNIT_COLUMN), [
    UNIT_PERSON_DAY,
    UNIT_PERSON_MONTH,
  ]);
  getColumnBody_(schedule, SCHEDULE_START_COLUMN, 2).setNumberFormat(
    DATE_FORMAT,
  );

  // イベント
  const events = getOrCreateSheet_(ss, EVENT_SHEET_NAME);
  writeHeaderIfEmpty_(events, EVENT_HEADERS);
  setRangeValidation_(
    getColumnBody_(events, EVENT_TRIAL_COLUMN),
    trials.getRange('A2:A'),
    false,
  );
  setRangeValidation_(
    getColumnBody_(events, EVENT_NAME_COLUMN),
    eventMaster.getRange('A2:A'),
    // イベント一覧にないイベントも入力できる（警告表示のみ）
    true,
  );
  setRoundValidation_(getColumnBody_(events, EVENT_ROUND_COLUMN));
  setDateValidation_(getColumnBody_(events, EVENT_DATE_COLUMN));

  // タイムライン用データ（自動生成）
  const timeline = getOrCreateSheet_(ss, TIMELINE_SHEET_NAME);
  writeHeaderIfEmpty_(timeline, TIMELINE_HEADERS);

  refreshAll_();
}

// ---- 読み込み ----

/**
 * 試験一覧を読み込む（略称が空の行は除く）。
 */
function readTrials_(ss: Spreadsheet): Trial[] {
  return readBody_(ss.getSheetByName(TRIAL_MASTER_SHEET_NAME))
    .map(row => {
      const lpo = row[TRIAL_LPO_COLUMN - 1];
      const dataLock = row[TRIAL_DATA_LOCK_COLUMN - 1];
      return {
        name: String(row[TRIAL_NAME_COLUMN - 1]),
        hidden: String(row[TRIAL_VISIBILITY_COLUMN - 1]) === VISIBILITY_HIDDEN,
        lpo: isDate_(lpo) ? lpo : null,
        dataLock: isDate_(dataLock) ? dataLock : null,
      };
    })
    .filter(trial => trial.name !== '');
}

/**
 * 作業テンプレートを読み込む（作業名が空の行は除く）。
 */
function readTaskTemplates_(ss: Spreadsheet): TaskTemplate[] {
  return readBody_(ss.getSheetByName(TASK_TEMPLATE_SHEET_NAME))
    .map(([task, base, order, period, unit]) => ({
      task: String(task),
      base: String(base),
      order: Number(order),
      period: Number(period),
      unit: String(unit),
    }))
    .filter(template => template.task !== '');
}

/**
 * スケジュールシートの入力部分（略称〜単位）を読み込む。空行も含め行の並びを保つ。
 */
function readTaskRows_(sheet: Sheet): TaskRow[] {
  return readBody_(sheet).map(row => ({
    trial: String(row[SCHEDULE_TRIAL_COLUMN - 1]),
    task: String(row[SCHEDULE_TASK_COLUMN - 1]),
    round: String(row[SCHEDULE_ROUND_COLUMN - 1]),
    base: String(row[SCHEDULE_BASE_COLUMN - 1]),
    order: Number(row[SCHEDULE_ORDER_COLUMN - 1]),
    period: Number(row[SCHEDULE_PERIOD_COLUMN - 1]),
    unit: String(row[SCHEDULE_UNIT_COLUMN - 1]),
  }));
}

/**
 * イベントシートを読み込む。
 */
function readEvents_(ss: Spreadsheet): EventRow[] {
  return readBody_(ss.getSheetByName(EVENT_SHEET_NAME)).map(row => {
    const date = row[EVENT_DATE_COLUMN - 1];
    return {
      trial: String(row[EVENT_TRIAL_COLUMN - 1]),
      name: String(row[EVENT_NAME_COLUMN - 1]),
      round: String(row[EVENT_ROUND_COLUMN - 1]),
      date: isDate_(date) ? date : null,
    };
  });
}

// ---- 更新処理 ----

/**
 * LPO とデータロックが入力された試験について、足りない作業の行をスケジュールシートの末尾に追加する。
 * 既にある行は変更しない。追加後の全行を返す。
 */
function appendMissingTaskRows_(
  schedule: Sheet,
  trials: Trial[],
  templates: TaskTemplate[],
): TaskRow[] {
  const rows = readTaskRows_(schedule);
  const missing = findMissingTaskRows_(trials, rows, templates);
  if (missing.length > 0) {
    schedule
      .getRange(
        schedule.getLastRow() + 1,
        1,
        missing.length,
        SCHEDULE_INPUT_WIDTH,
      )
      .setValues(
        missing.map(row => [
          row.trial,
          row.task,
          row.round,
          row.base,
          row.order,
          row.period,
          row.unit,
        ]),
      );
  }
  return [...rows, ...missing];
}

/**
 * スケジュールシートの開始日・完了日・警告を計算して書き込む。計算結果を行の並びで返す。
 */
function writeTaskDates_(
  schedule: Sheet,
  trials: Trial[],
  rows: TaskRow[],
  events: EventRow[],
): TaskDates[] {
  const results: TaskDates[] = rows.map(() => ({
    start: null,
    end: null,
    warning: '',
  }));

  // 試験ごとに行を集めて計算する
  trials.forEach(trial => {
    const indexes = rows
      .map((row, index) => index)
      .filter(index => rows[index].trial === trial.name);
    const dates = scheduleTrialTasks_(
      trial,
      indexes.map(index => rows[index]),
      events,
    );
    indexes.forEach((rowIndex, i) => (results[rowIndex] = dates[i]));
  });

  if (rows.length > 0) {
    schedule
      .getRange(2, SCHEDULE_START_COLUMN, rows.length, SCHEDULE_OUTPUT_WIDTH)
      .setValues(results.map(r => [r.start ?? '', r.end ?? '', r.warning]));
  }
  return results;
}

/**
 * タイムライン用データシートを作り直す。
 */
function writeTimeline_(
  ss: Spreadsheet,
  trials: Trial[],
  rows: TaskRow[],
  dates: TaskDates[],
  events: EventRow[],
): void {
  const timeline = ss.getSheetByName(TIMELINE_SHEET_NAME);
  if (!timeline) {
    return;
  }
  const entries = buildTimelineRows_(
    trials,
    rows.map((row, index) => ({row, dates: dates[index]})),
    events,
  );

  // ヘッダー以外の値と背景色を消してから書き込む
  if (timeline.getMaxRows() > 1) {
    getColumnBody_(timeline, 1, TIMELINE_HEADERS.length)
      .clearContent()
      .setBackground(null);
  }
  if (entries.length > 0) {
    const body = timeline.getRange(
      2,
      1,
      entries.length,
      TIMELINE_HEADERS.length,
    );
    body.setValues(entries.map(entry => entry.row));
    // 作業は白、イベントは色付きで行の背景を塗る（タイムライン表示の「カードの色」に使う）
    body.setBackgrounds(
      entries.map(entry =>
        TIMELINE_HEADERS.map(() =>
          entry.isEvent ? EVENT_BACKGROUND : TASK_BACKGROUND,
        ),
      ),
    );
    timeline.getRange(2, 3, entries.length, 2).setNumberFormat(DATE_FORMAT);
  }
}

/**
 * 非表示の試験の行を隠し、それ以外の行を表示する（A列が略称のシートが対象）。
 */
function applyRowVisibility_(
  sheet: Sheet | null,
  hiddenTrials: Set<string>,
): void {
  if (!sheet || sheet.getLastRow() < 2) {
    return;
  }
  const lastRow = sheet.getLastRow();
  const names = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .map(row => String(row[0]));
  // いったん全行を表示してから、非表示の試験の行を連続範囲ごとにまとめて隠す
  sheet.showRows(2, lastRow - 1);
  findHiddenRowRuns_(names, hiddenTrials).forEach(([start, count]) => {
    sheet.hideRows(start + 2, count);
  });
}

/**
 * すべてを最新の状態にする。
 * 1. LPO・データロックが入った試験の作業の行を追加
 * 2. 作業の開始日・完了日・警告を計算
 * 3. タイムライン用データを作り直す
 * 4. 非表示の試験の行を隠す
 */
export function refreshAll_(): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const schedule = ss.getSheetByName(SCHEDULE_SHEET_NAME);
  if (!schedule) {
    return;
  }
  const trials = readTrials_(ss);
  const templates = readTaskTemplates_(ss);

  const rows = appendMissingTaskRows_(schedule, trials, templates);
  const events = readEvents_(ss);
  const dates = writeTaskDates_(schedule, trials, rows, events);
  writeTimeline_(ss, trials, rows, dates, events);

  const hiddenTrials = new Set(
    trials.filter(trial => trial.hidden).map(trial => trial.name),
  );
  applyRowVisibility_(schedule, hiddenTrials);
  applyRowVisibility_(ss.getSheetByName(EVENT_SHEET_NAME), hiddenTrials);
}
