function issue89() {
  const ssId = PropertiesService.getScriptProperties().getProperty('ssId');
  const ss = SpreadsheetApp.openById(ssId);
  const sheetNames = ss.getSheets().map(x => x.getName());
  const yearsSheet = [
    'Setup',
    'Registration_1',
    'Registration_2',
    'Interim_1',
    'Observation_1',
    'Interim_2',
    'Observation_2',
    'Closing',
  ].map(x => ss.getSheetByName(x));
  // ここはテスト用 ↓
  //yearsSheet.forEach(sheet =>
  //  sheet
  //    .getRange('D13')
  //    .setFormula(
  //      '=TRUNC(((sumif($F$5:$F$11, ">0", $H$5:$H$11) + sumif($F$14:$F$63, ">0", $H$14:$H$63)) * 0.1)/F13)'
  //    )
  //);
  // ここはテスト用 ↑
  yearsSheet.forEach(sheet =>
    sheet.getRange('H98').setFormula('=trunc(H97*(1+Trial!$B$45))')
  );
  // QuoteシートD33
  const quoteSheetnames = sheetNames.filter(x => /^Quote.*$/.test(x));
  const quoteSheets = quoteSheetnames.map(x => ss.getSheetByName(x));
  quoteSheets.forEach(sheet => {
    const targetRange = sheet.getRange('D33');
    targetRange.setFormula('=trunc(D32*Trial!$B$45)');
  });
  // TotalシートH98
  const totalSheetnames = sheetNames.filter(x => /^Total(_|$)/.test(x));
  const totalSheets = totalSheetnames.map(x => ss.getSheetByName(x));
  totalSheets.forEach(sheet => {
    const targetRange = sheet.getRange('H98');
    targetRange.setFormula('=trunc(H97*(1+Trial!$B$45))');
  });
  // Total2シートD97-L97
  const total2Sheetnames = sheetNames.filter(x => /^Total2(_|$)/.test(x));
  const total2Sheets = total2Sheetnames.map(x => ss.getSheetByName(x));
  total2Sheets.forEach(sheet => {
    // 税込行が無ければ追加する
    const lastRow = sheet.getLastRow();
    if (lastRow < 98) {
      sheet.insertRowAfter(97);
      const copyFrom = ss.getSheetByName('Total2').getRange('A98:N98');
      copyFrom.copyTo(sheet.getRange('A98:N98'), { formatOnly: false });
    }
    const targetRange = sheet.getRange('D98:L98');
    const formulas = targetRange.getFormulas().flat();
    const editFormulas = formulas.map(x => {
      if (x.startsWith('=trunc(')) {
        return x;
      } else {
        return x.replace('=', '=trunc(') + ')';
      }
    });
    targetRange.setFormulas([editFormulas]);
  });
  // ついでに修正する
  ss.getSheetByName('Total')
    .getRange('B98:L98')
    .copyTo(ss.getSheetByName('Total_nmc').getRange('B98:L98'), {
      formatOnly: false,
    });
  ss.getSheetByName('Total')
    .getRange('B98:L98')
    .copyTo(ss.getSheetByName('Total_oscr').getRange('B98:L98'), {
      formatOnly: false,
    });
}

function roundUpToNearestThousand_(value) {
  return Math.ceil(value / 1000) * 1000;
}

function test() {
  const ssId = PropertiesService.getScriptProperties().getProperty('ssId');
  const ss = SpreadsheetApp.openById(ssId);
  const sheetNames = ss.getSheets().map(x => x.getName());
  const trialSheet = ss.getSheetByName('Trial');
  trialSheet.getRange('B44').setValue(1.5);
  const ymList = [['2024/6/1', '2024/11/30']];
  const item1Value = 65000 * 3 * 5 * 1.5;
  const item2Value = 65000 * 0.25 * 5 * 1.5 * 6;
  const roundedItem1Value = roundUpToNearestThousand_(item1Value);
  const roundedItem2Value = roundUpToNearestThousand_(item2Value);
  const item3Value = (((roundedItem1Value + roundedItem2Value) * 0.1) / 6) * 6;
  const sum1Value = roundedItem1Value + roundedItem2Value + item3Value;
  const sum2Value = sum1Value;
  const tax = sum1Value * 0.1;
  const sum3Value = sum1Value + tax;
  for (let i = 32; i < 40; i++) {
    const sheetName = trialSheet.getRange(i, 1).getValue();
    trialSheet.getRange('D32:E40').clearContent();
    trialSheet.getRange(i, 4, 1, 2).setValues(ymList);
    trialSheet.getRange('D40:E40').setValues(ymList);
    const targetSheet = ss.getSheetByName(sheetName);
    targetSheet.getRange('F:F').clearContent();
    targetSheet.getRange('F6:F7').setValues([[1], [6]]);
    targetSheet.getRange('F13').setValue(6);
    SpreadsheetApp.flush();
    if (
      roundedItem1Value === targetSheet.getRange('H6').getValue() &&
      roundedItem2Value === targetSheet.getRange('H7').getValue() &&
      item3Value === targetSheet.getRange('H13').getValue() &&
      sum1Value === targetSheet.getRange('H96').getValue() &&
      sum2Value === targetSheet.getRange('H97').getValue() &&
      sum3Value === targetSheet.getRange('H98').getValue()
    ) {
    } else {
      throw new Error('test2');
    }
  }
  console.log('setup~closing OK');
  const divErrorStr = '#DIV/0!';
  // Quoteシート
  const trialYears = [
    ['2024/4/1', '2025/3/31'],
    ['2025/4/1', '2026/3/31'],
    ['2026/4/1', '2027/3/31'],
    ['2027/4/1', '2028/3/31'],
    ['2028/4/1', '2029/3/31'],
    ['2029/4/1', '2030/3/31'],
    ['2030/4/1', '2031/3/31'],
    ['2031/4/1', '2032/3/31'],
    ['2024/4/1', '2032/3/31'],
  ];
  const quoteSheetnames = sheetNames.filter(x => /^Quote.*$/.test(x));
  const quoteSheets = quoteSheetnames.map(x => ss.getSheetByName(x));
  quoteSheets.forEach(sheet => {
    trialSheet.getRange('D32:E40').clearContent();
    for (let i = 30; i <= 34; i++) {
      const temp = sheet.getRange(i, 4).getValue();
      if (temp !== 0 && temp !== divErrorStr) {
        throw new Error('test2');
      }
    }
  });
  trialSheet.getRange('D32:E40').setValues(trialYears);
  SpreadsheetApp.flush();
  const [quoteAll, quoteNmc, quoteOscr] = ['', '_nmc', '_oscr'].map(y =>
    ['Quote', 'Total', 'Total2'].map(x => {
      const sheetname = `${x}${y}`;
      return ss.getSheetByName(sheetname);
    })
  );
  const itemArray = [roundedItem1Value, roundedItem2Value, item3Value];
  quoteCheck_(quoteAll, 1, itemArray);
  quoteCheck_(quoteNmc, 0.9, itemArray);
  quoteCheck_(quoteOscr, 0.1, itemArray);
  console.log('quote, total, total2 ok.');
}
function quoteCheck_(sheetArray, rate, itemArray) {
  const [quote, total, total2] = sheetArray;
  const projectmanagement = rate === 0.1 ? 0 : itemArray[2];
  const sum1Value =
    (itemArray[0] * rate + itemArray[1] * rate + projectmanagement) * 8;
  const tax = sum1Value * 0.1;
  const sum3Value = sum1Value + tax;
  if (
    quote.getRange('D30').getValue() !== sum1Value ||
    quote.getRange('D31').getValue() !== 0 ||
    quote.getRange('D32').getValue() !== sum1Value ||
    quote.getRange('D33').getValue() !== tax ||
    quote.getRange('D34').getValue() !== sum3Value
  ) {
    throw new Error('quoteCheck');
  }
  if (
    total.getRange('H96').getValue() !== sum1Value ||
    total.getRange('H97').getValue() !== sum1Value ||
    total.getRange('H98').getValue() !== sum3Value
  ) {
    throw new Error('totalCheck');
  }
  if (
    total2.getRange('L96').getValue() !== sum1Value ||
    total2.getRange('L97').getValue() !== sum1Value ||
    total2.getRange('L98').getValue() !== sum3Value
  ) {
    throw new Error('total2Check');
  }
}
/*
function test() {
  const ssId = PropertiesService.getScriptProperties().getProperty('ssId');
  const ss = SpreadsheetApp.openById(ssId);
  const yearsSheet = [
    'Setup',
    'Registration_1',
    'Registration_2',
    'Interim_1',
    'Observation_1',
    'Interim_2',
    'Observation_2',
    'Closing',
  ].map(x => ss.getSheetByName(x));
  yearsSheet.forEach(sheet =>
    sheet
      .getRange('D13')
      .setFormula(
        '=((sumif($F$5:$F$11, ">0", $H$5:$H$11) + sumif($F$14:$F$63, ">0", $H$14:$H$63)) * 0.1)/F13'
      )
  );
}
*/
