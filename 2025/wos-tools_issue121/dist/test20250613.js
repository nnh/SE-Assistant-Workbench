function test20250613() {
  // 20250613GUIで修正状況確認
  const Spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  const outputSheet = Spreadsheet.getSheetByName('20250613GUIで修正状況確認');
  const inputSheet1 = Spreadsheet.getSheetByName(
    '提出用_クラリベイト社に送付する添付資料'
  );
  const inputSheet2 = Spreadsheet.getSheetByName(
    '20250611クラリベイト社からの返信１'
  );
  if (!outputSheet || !inputSheet1 || !inputSheet2) {
    throw new Error(
      'One or more sheets not found: 20250613GUIで修正状況確認, 提出用_クラリベイト社に送付する添付資料, 20250611クラリベイト社からの返信１'
    );
  }
  const inputData1 = inputSheet1
    .getDataRange()
    .getValues()
    .filter(row => row[0] !== '');
  const inputData2 = inputSheet2
    .getDataRange()
    .getValues()
    .filter(row => row[0] !== '');
  outputSheet.clear(); // 出力シートをクリア
  const inputData2Authors = inputData2.map(row => {
    const result = [...row];
    const match = result[2] && result[2].match(/\(([^)]+)\)/);
    const authorName = match ? match[1] : '';
    result.push(authorName);
    return result;
  });
  const joinedData = inputData1.map(row1 => {
    const row2 = inputData2Authors.find(
      row2 => row2[1] === row1[1] && row2[8] === row1[2]
    );
    console.log(row2);
  });

  console.log(0);
  // 出力
  //outputSheet.getRange(1, 1, result.length, result[0].length).setValues(result);
}
