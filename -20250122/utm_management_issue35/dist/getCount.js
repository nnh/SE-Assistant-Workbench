function getCount() {
  const inputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[1];
  const outputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[2];
  const inputValues = inputSheet.getDataRange().getValues();
  const computerSet = new Set(inputValues.map(([_, pcname]) => pcname));
  // 一度だけなら除外
  const computerNameCount = Array.from(computerSet)
    .map(pcname => inputValues.filter(([_, x]) => x === pcname))
    .filter(x => x.length > 1);
  const targetValues = computerNameCount
    .map(pcinfo => {
      const pcname = Array.from(new Set(pcinfo.map(([, pcname]) => pcname)))[0];
      const ymdlist = pcinfo.map(([ymd, _]) => new DateUtils().formatDate(ymd));
      const ymdUnique = Array.from(new Set(ymdlist));
      const ymdjoin = ymdUnique.join(', ');
      const count = ymdUnique.length;
      return [pcname, ymdjoin, count];
    })
    .filter(([_x, _y, cnt]) => cnt > 1);
  outputSheet.clear();
  outputSheet.getRange(1, 1).setValue('PC名');
  outputSheet.getRange(1, 2).setValue('年月');
  outputSheet.getRange(1, 3).setValue('回数');
  const sortedData = targetValues.sort((a, b) => b[2] - a[2]);
  outputSheet
    .getRange(2, 1, sortedData.length, sortedData[0].length)
    .setValues(sortedData);
}
