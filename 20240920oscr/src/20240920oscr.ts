function main(): void {
  const spreadsheetId: string | null =
    PropertiesService.getScriptProperties().getProperty('testSsId');
  if (spreadsheetId === null) {
    throw new Error('No spreadsheetId');
  }
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(spreadsheetId);
  modSpreadSheet_(spreadsheet);
}
function modSpreadSheet_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): void {
  const targetSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    spreadsheet.getSheetByName('Base');
  if (targetSheet === null) {
    console.log(
      `No target sheet in the spreadsheet: ${spreadsheet.getName()} (URL: ${spreadsheet.getUrl()})`
    );
    return;
  }
  // 年度のプルダウンリストを再作成
  createDropdown_(targetSheet.getRange('D1'));
  // 控除時間を追加
  if (targetSheet.getRange('K43').getValue() === '控除時間') {
    return;
  }
  targetSheet
    .getRange('N43')
    .setFormula('=IF($N$40+$N$41-$N$42<0,"0時間00分",$N$40+$N$41-$N$42)');
  targetSheet.getRange('N44').setFormula('=COUNTIF($B$7:$B$37,1)');
  targetSheet.getRange('N45').setFormula('=COUNT($M$7:$M$37)');
  targetSheet.getRange('K43:N43').insertCells(SpreadsheetApp.Dimension.ROWS);
  targetSheet
    .getRange('N43')
    .setFormula('=IF($N$40+$N$41-$N$42<0,$N$40+$N$41-$N$42,"0時間00分")');
  targetSheet.getRange('K43').setValue('控除時間');
}
function updateDropdown_(range: GoogleAppsScript.Spreadsheet.Range): void {
  range.clearDataValidations();
  createDropdown_(range);
}

function createDropdown_(range: GoogleAppsScript.Spreadsheet.Range): void {
  // 2023から2033までの数値を作成
  const years = Array.from({ length: 11 }, (_, i) => (2023 + i).toString());

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(years, true) // プルダウンリストを作成
    .build();
  range.setDataValidation(rule);
}
