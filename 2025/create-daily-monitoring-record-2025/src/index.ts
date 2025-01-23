const headerLastRow: number = 3;
const bodyStartRow: number = headerLastRow + 1;
const holidaySheetName: string = '祝日';
const closedServersSheetName: string = 'wk_closed_servers';

function main() {
  const copySourceSsId: string = getPropertyById_('copySourceSheetId');
  const copySourceSpreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    getSpreadsheetById_(copySourceSsId);
  if (
    copySourceSpreadSheet.getSheetByName(holidaySheetName) === null ||
    copySourceSpreadSheet.getSheetByName(closedServersSheetName) === null
  ) {
    throw Error(
      `${holidaySheetName} or ${closedServersSheetName} Sheet not found`
    );
  }

  const copySourceSheets: GoogleAppsScript.Spreadsheet.Sheet[] =
    copySourceSpreadSheet.getSheets();
  const { thisYear, lastYear } = getYears_();
  const lastYearSheetName: string = `${lastYear}年度`;
  const lastYearSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetByName_(
    copySourceSpreadSheet,
    lastYearSheetName
  );
  if (lastYearSheet === null) {
    throw new Error(`${lastYearSheetName} Sheet not found`);
  }
  createHolidaySheet_(copySourceSpreadSheet);
  const otherSheets: GoogleAppsScript.Spreadsheet.Sheet[] =
    copySourceSheets.filter(
      sheet =>
        sheet.getName() !== lastYearSheetName &&
        sheet.getName() !== holidaySheetName
    );
  otherSheets.forEach(sheet => {
    const targetSheetName: string = sheet.getName();
    if (
      SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName) !==
      null
    ) {
      SpreadsheetApp.getActiveSpreadsheet().deleteSheet(
        SpreadsheetApp.getActiveSpreadsheet().getSheetByName(targetSheetName)!
      );
    }
    sheet.copyTo(SpreadsheetApp.getActiveSpreadsheet());
    renameCopiedSheet_(
      SpreadsheetApp.getActiveSpreadsheet().getSheets(),
      sheet.getName()
    );
  });

  const thisYearSheetName: string = `${thisYear}年度`;
  const thisSpreadSheetSheetNames: string[] =
    SpreadsheetApp.getActiveSpreadsheet()
      .getSheets()
      .map(sheet => sheet.getName());
  if (!thisSpreadSheetSheetNames.includes(thisYearSheetName)) {
    SpreadsheetApp.getActiveSpreadsheet().insertSheet(thisYearSheetName);
  }
  const thisYearSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetByName_(
    SpreadsheetApp.getActiveSpreadsheet(),
    thisYearSheetName
  );
  createYearSheet_(lastYearSheet, thisYearSheet);
  deleteClosedServersColumns_(thisYearSheet);
}
function deleteClosedServersColumns_(
  thisYearSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  const closedServers: string[] | undefined =
    SpreadsheetApp.getActiveSpreadsheet()
      .getSheetByName(closedServersSheetName)
      ?.getRange('A:A')
      .getValues()
      .flat()
      .filter(x => x !== '');
  if (closedServers === undefined) {
    return;
  }
  const serverNameRow: number = 2;
  const lastColumnNumber: number = thisYearSheet.getLastColumn();
  for (let i = lastColumnNumber; i > 0; i--) {
    const serverName = thisYearSheet.getRange(serverNameRow, i).getValue();
    if (closedServers.includes(serverName)) {
      thisYearSheet.deleteColumn(i);
    }
  }
}
function createYearSheet_(
  lastYearSheet: GoogleAppsScript.Spreadsheet.Sheet,
  thisYearSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  thisYearSheet.clear();
  const headerRows: string[][] = lastYearSheet
    .getRange(1, 1, headerLastRow, lastYearSheet.getLastColumn())
    .getValues();
  thisYearSheet
    .getRange(1, 1, headerLastRow, lastYearSheet.getLastColumn())
    .setValues(headerRows);
  setFormat_(lastYearSheet, thisYearSheet);
  const dateHeader: string[][] = createDateAndWeekdayArray_(null, null);
  thisYearSheet
    .getRange(bodyStartRow, 1, dateHeader.length, dateHeader[0].length)
    .setValues(dateHeader);
}
function renameCopiedSheet_(
  sheets: GoogleAppsScript.Spreadsheet.Sheet[],
  sheetName: string
): void {
  const copiedSheet: GoogleAppsScript.Spreadsheet.Sheet[] = sheets.filter(
    sheet => sheet.getName() === `${sheetName} のコピー`
  );
  if (copiedSheet.length === 0) {
    console.log(`${sheetName} のコピー Sheet not found`);
    return;
  }
  copiedSheet[0].setName(sheetName);
}
function createHolidaySheet_(
  copySourceSpreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): void {
  if (
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(holidaySheetName) !==
    null
  ) {
    return;
  }
  const copyFromSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    copySourceSpreadSheet.getSheetByName(holidaySheetName);
  if (copyFromSheet === null) {
    throw new Error(`${holidaySheetName} Sheet not found`);
  }
  copyFromSheet.copyTo(SpreadsheetApp.getActiveSpreadsheet());
  renameCopiedSheet_(
    SpreadsheetApp.getActiveSpreadsheet().getSheets(),
    holidaySheetName
  );
  const holidaySheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(holidaySheetName);
  if (holidaySheet === null) {
    throw new Error(`${holidaySheetName} Sheet not found`);
  }
  SpreadsheetApp.getActiveSpreadsheet().setNamedRange(
    'holiday',
    holidaySheet.getRange('A:A')
  );
}
function setFormat_(
  sourceSheet: GoogleAppsScript.Spreadsheet.Sheet,
  targetSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  // 元のシートの列数と行数を取得
  const columnCount: number = sourceSheet.getMaxColumns();
  const rowCount: number = sourceSheet.getMaxRows();
  const targetConditionalFormattingRange: GoogleAppsScript.Spreadsheet.Range =
    targetSheet.getRange(bodyStartRow, 1, rowCount, columnCount);
  setConditionalFormatting_(targetConditionalFormattingRange, [
    '=or(weekday($A4, 1)=1, weekday($A4, 1)=7)',
    '=countif(indirect("holiday"), $A4)=1',
  ]);
  targetSheet
    .getRange(1, 1, rowCount, columnCount)
    .setBorder(true, true, true, true, true, true);
  targetSheet
    .getRange(1, 1, headerLastRow, columnCount)
    .setBackground('#CCCCCC')
    .setFontWeight('bold');
  setSubtractionFormula_(targetSheet.getRange(bodyStartRow, 7, rowCount, 1));
  const titleArray: string[] = sourceSheet
    .getRange(headerLastRow, 1, 1, columnCount)
    .getValues()[0];
  const durationColumns: number[] = getTargetColumnIdxes_(
    titleArray,
    '処理時間'
  );
  durationColumns.forEach(idx =>
    setSubtractionFormula_(targetSheet.getRange(bodyStartRow, idx, rowCount, 1))
  );

  for (let i = 1; i <= columnCount; i++) {
    const width = sourceSheet.getColumnWidth(i);
    targetSheet.setColumnWidth(i, width);
  }
  targetSheet.autoResizeRows(1, rowCount);
  targetSheet.getDataRange().setWrap(true);
  targetSheet.setFrozenColumns(2);
  targetSheet.setFrozenRows(headerLastRow);
  targetSheet.getDataRange().clearDataValidations();
  addDropdownToCColumnWithOptions_(
    targetSheet.getRange(bodyStartRow, 3, rowCount, 1),
    ['OK', 'NG']
  );
  const statusColumns: number[] = getTargetColumnIdxes_(titleArray, '状態');
  statusColumns.forEach(idx =>
    addDropdownToCColumnWithOptions_(
      targetSheet.getRange(bodyStartRow, idx, rowCount, 1),
      ['完了', '停止', '警告', '未実行']
    )
  );
  const operatorColumns: number[] = getTargetColumnIdxes_(titleArray, '作業者');
  operatorColumns.forEach(idx =>
    addDropdownToCColumnWithOptions_(
      targetSheet.getRange(bodyStartRow, idx, rowCount, 1),
      ['佐藤', '小林', '大塚']
    )
  );
  targetSheet.getRange('A:A').setNumberFormat('M/d');
}
function getTargetColumnIdxes_(
  titleArray: string[],
  targetItem: string
): number[] {
  const targetColumns: number[] = titleArray
    .map((value, idx) => (value === targetItem ? idx + 1 : -1))
    .filter(idx => idx !== -1);
  return targetColumns;
}
function createDateAndWeekdayArray_(
  startDate: string | null,
  endDate: string | null
): string[][] {
  const today: Date = new Date();
  const defaultStartDate: Date = new Date(today.getFullYear(), 2, 31); // 今年の3/31
  const defaultEndDate: Date = new Date(today.getFullYear() + 1, 2, 31); // 来年の3/31

  const start: Date =
    startDate !== null ? new Date(startDate) : defaultStartDate;
  const end: Date = endDate !== null ? new Date(endDate) : defaultEndDate;
  const dateArray: string[][] = [];

  // 日付をループして配列を作成
  for (let d: Date = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr: string = Utilities.formatDate(
      d,
      Session.getScriptTimeZone(),
      'yyyy/MM/dd'
    );
    const weekday: string = ['日', '月', '火', '水', '木', '金', '土'][
      d.getDay()
    ]; // 日～土
    dateArray.push([dateStr, weekday]);
  }

  return dateArray;
}
function setSubtractionFormula_(
  targetRange: GoogleAppsScript.Spreadsheet.Range
): void {
  // 範囲の行数を取得
  const numRows: number = targetRange.getNumRows();
  const startRow: number = targetRange.getRow();
  const startColumn: number = targetRange.getColumn();

  // 数式を設定
  for (let i = 0; i < numRows; i++) {
    const row: number = startRow + i;
    const col1: string = targetRange
      .getSheet()
      .getRange(row, startColumn - 1)
      .getA1Notation()
      .replace(/\d+$/, '');
    const col2: string = targetRange
      .getSheet()
      .getRange(row, startColumn - 2)
      .getA1Notation()
      .replace(/\d+$/, '');

    const formula: string = `=${col1}${row}-${col2}${row}`;
    const cell = targetRange.getCell(i + 1, 1);
    cell.setFormula(formula);
    cell.setNumberFormat('hh:mm:ss');
  }
}
function setConditionalFormatting_(
  targetRange: GoogleAppsScript.Spreadsheet.Range,
  targetFormula: string[]
): void {
  const sheet = targetRange.getSheet();
  sheet.setConditionalFormatRules([]);
  const rules = [
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(targetFormula[0])
      .setBackground('#CCCCCC') // 背景色
      .setRanges([targetRange])
      .build(),
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied(targetFormula[1])
      .setBackground('#CCCCCC') // 背景色
      .setRanges([targetRange])
      .build(),
  ];
  sheet.setConditionalFormatRules(rules);
}
