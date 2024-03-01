function addSheets_1_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const target = ss.getSheetByName("確認事項").getRange("A2:A10").getValues();
  target.forEach(sheetname => {
    ss.insertSheet();
    ss.getActiveSheet().setName(sheetname);
  })
}
