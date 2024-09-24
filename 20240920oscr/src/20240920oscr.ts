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
