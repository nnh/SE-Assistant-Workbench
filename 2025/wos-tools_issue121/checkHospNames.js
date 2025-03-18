function checkHospNames() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("施設名");
  const namesFromWeb = sheet
    .getRange(2, 1, sheet.getLastRow() - 1, 1)
    .getValues()
    .flat();
  const namesFromQuery = sheet
    .getRange(2, 3, sheet.getLastRow() - 1, 1)
    .getValues()
    .flat();
  // 差分を取る
  const trim1 = namesFromWeb.map((name) => name.trim());
  const trim2 = namesFromQuery.map((name) => name.trim());
  const diff1 = trim1
    .filter((name) => !trim2.includes(name))
    .filter((name) => name !== "");
  const diff2 = trim2
    .filter((name) => !trim1.includes(name))
    .filter((name) => name !== "");
  const outputValues1 = diff1.map((name) => [name]);
  const outputValues2 = diff2.map((name) => [name]);
  sheet.getRange(2, 4, outputValues1.length, 1).setValues(outputValues1);
  sheet.getRange(2, 6, outputValues2.length, 1).setValues(outputValues2);
}
