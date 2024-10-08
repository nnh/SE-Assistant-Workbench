function getTargetSheet_(): GoogleAppsScript.Spreadsheet.Sheet {
  const spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(
      SpreadsheetApp.getActiveSpreadsheet()
        .getSheets()[0]
        .getRange(1, 1)
        .getValue()
    );
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    spreadSheet.getSheetByName('Quotation Request');
  if (inputSheet === null) {
    throw new Error('シートが見つかりません');
  }
  const targetSheets: GoogleAppsScript.Spreadsheet.Sheet[] = [
    'Setup',
    'Registration_1',
    'Registration_2',
    'Interim_1',
    'Observation_1',
    'Interim_2',
    'Observation_2',
    'Closing',
  ].map((sheetName: string) => {
    const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
      spreadSheet.getSheetByName(sheetName);
    if (sheet === null) {
      throw new Error('シートが見つかりません');
    }
    return sheet;
  });
  targetSheets.forEach((sheet: GoogleAppsScript.Spreadsheet.Sheet) => {
    sheet.getRange('F6:F94').clearContent();
  });
  return inputSheet;
}
function setCommonSettings_(): void {
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet = getTargetSheet_();
  const values: string[][] = [
    [
      '2024/10/07 11:00:00',
      '参考見積',
      'テスト見積発行先',
      'テスト研究代表者名',
      'テスト試験課題名',
      'テスト試験実施番号',
      '特定臨床研究',
      '',
      '',
      '',
      '',
      'あり',
      'あり',
      '2027/03/31',
      '0',
      '0',
      '8',
      '500000',
      '設置・委託する',
      '設置・委託する',
      'なし',
      '55',
      '20',
      '450',
      '2026/03/02',
      '2028/03/01',
      '2029/03/02',
      'あり',
      '3',
      '',
      '',
      '50',
      'あり',
      '',
      'なし',
      'なし',
      'なし',
      'なし',
      '',
      '営利企業原資（製薬企業等）',
      'なし',
      'あり',
      'あり',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ],
  ];
  inputSheet.getRange(2, 1, values.length, values[0].length).setValues(values);
}
function test1() {
  // 事務局運営ありでsetupシートの期間が7か月のケース
  // Setupのデータベース管理料が1	ヶ月ならOK
  // Totalのデータベース管理料が43	ヶ月ならOK
  // 合計	（税抜）	67,970,500   ならOK
  setCommonSettings_();
}
function test2() {
  // 事務局運営ありでsetupシートの期間が6か月のケース
  // Setupのデータベース管理料が空白ならOK
  // Totalのデータベース管理料が42	ヶ月ならOK
  // 合計	（税抜）	66,898,000  ならOK
  setCommonSettings_();
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet = getTargetSheet_();
  inputSheet.getRange('Y2').setValue('2026/04/01');
}
function test3() {
  // 事務局運営ありでsetupシートの期間が5か月のケース
  // Setupのデータベース管理料が空白ならOK
  // registration1のデータベース管理料が11	ヶ月ならOK
  // Totalのデータベース管理料が41	ヶ月ならOK
  // 合計	（税抜）	65,825,500 ならOK
  setCommonSettings_();
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet = getTargetSheet_();
  inputSheet.getRange('Y2').setValue('2026/05/01');
}
function test4() {
  // 事務局運営なしでsetupシートの期間が4か月のケース
  // Setupのデータベース管理料が1	ヶ月ならOK
  // Totalのデータベース管理料が40	ヶ月ならOK
  // 合計	（税抜）	  28,338,600   ならOK
  setCommonSettings_();
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet = getTargetSheet_();
  inputSheet.getRange('G2').setValue('観察研究・レジストリ');
  inputSheet.getRange('M2').setValue('なし');
  inputSheet.getRange('AN2').setValue('公的資金（税金由来）');
  inputSheet.getRange('AQ2').setValue('なし');
}
function test5() {
  // 観察研究・レジストリでsetupシートの期間が3か月のケース
  // Setupのデータベース管理料が空白ならOK
  // Totalのデータベース管理料が39	ヶ月ならOK
  // 合計	（税抜）	 27,980,000  ならOK
  setCommonSettings_();
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet = getTargetSheet_();
  inputSheet.getRange('G2').setValue('観察研究・レジストリ');
  inputSheet.getRange('M2').setValue('なし');
  inputSheet.getRange('AN2').setValue('公的資金（税金由来）');
  inputSheet.getRange('AQ2').setValue('なし');
  inputSheet.getRange('Y2').setValue('2026/04/01');
}
function test6() {
  // 観察研究・レジストリでsetupシートの期間が2か月のケース
  // Setupのデータベース管理料が空白ならOK
  // Totalのデータベース管理料が38	ヶ月ならOK
  // 合計	（税抜）	27,621,400  ならOK
  setCommonSettings_();
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet = getTargetSheet_();
  inputSheet.getRange('G2').setValue('観察研究・レジストリ');
  inputSheet.getRange('M2').setValue('なし');
  inputSheet.getRange('AN2').setValue('公的資金（税金由来）');
  inputSheet.getRange('AQ2').setValue('なし');
  inputSheet.getRange('Y2').setValue('2026/05/01');
}
