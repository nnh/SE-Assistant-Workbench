const listSheetName = 'メール一覧';
const excludeIds = ['18c60e01e2c9c32c', '18a6952c4752dfda'];
function exportGmailToGoogleDocs() {
  const spreadsheet = getSpreadsheet_();
  const sheet = getSheet_(spreadsheet, listSheetName);
  const domain =
    PropertiesService.getScriptProperties().getProperty('targetDomain');
  if (!domain) {
    throw new Error('条件が設定されていません。');
  }
  const startDate = '2023/04/21';
  const today = new Date();
  const endDate = Utilities.formatDate(
    today,
    Session.getScriptTimeZone(),
    'yyyy/MM/dd'
  );
  const query = `to:(*${domain}) after:${formatDate_(startDate)} before:${formatDate_(endDate)}`;
  const threads = GmailApp.search(query);
  if (threads.length === 0) {
    console.log('該当するメールはありません。');
    return;
  }
  const threadsInfo = threads
    .map(thread => {
      const id = thread.getId();
      if (excludeIds.includes(id)) return null;
      const subject = thread.getFirstMessageSubject();
      const date = formatDate_(thread.getLastMessageDate());
      return { id, date, subject };
    })
    .filter(info => info !== null)
    .sort((a, b) => a.id.localeCompare(b.id));
  const ids = getIds_(sheet);
  const _temp = threadsInfo.filter(info => !ids.includes(info.id));
  if (_temp.length === 0) {
    console.log('新しいメールはありません。');
    return;
  }
  const outputValues = _temp.map(info => {
    return [info.id, info.date, info.subject];
  });
  setSheetValues_(sheet, outputValues);
  createNewSheet_(
    spreadsheet,
    outputValues.map(row => row[0])
  );
}
function createNewSheet_(spreadsheet, targetIds) {
  const sheetNames = spreadsheet
    .getSheets()
    .map(sheet => sheet.getName())
    .flat();
  const newSheetNames = targetIds.filter(id => !sheetNames.includes(id));
  newSheetNames.forEach(name => {
    spreadsheet.insertSheet(name);
  });
  spreadsheet.getSheetByName(listSheetName).activate();
  spreadsheet.moveActiveSheet(1);
}
function getIds_(sheet) {
  const values = sheet.getDataRange().getValues();
  const idValues = values.map(row => row[0]).flat();
  return idValues;
}
function setSheetValues_(sheet, values) {
  let outputRow = sheet.getLastRow() + 1;
  if (outputRow === 1) {
    const header = [['ID', '日付', '件名', '依頼者', 'ステータス', '詳細']];
    sheet.getRange(1, 1, 1, header[0].length).setValues(header);
    outputRow++;
  }
  sheet
    .getRange(outputRow, 1, values.length, values[0].length)
    .setValues(values);
}
function getSpreadsheet_() {
  const spreadsheetId =
    PropertiesService.getScriptProperties().getProperty('spreadsheetId');
  if (!spreadsheetId) {
    throw new Error('スプレッドシートIDが設定されていません。');
  }
  return SpreadsheetApp.openById(spreadsheetId);
}
function getSheet_(spreadsheet, sheetName) {
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`シート「${sheetName}」が見つかりません。`);
  }
  return sheet;
}
function formatDate_(date) {
  if (typeof date === 'string') date = new Date(date);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd');
}
function getNextDate_(dateStr) {
  const date = new Date(dateStr);
  date.setDate(date.getDate() + 1);
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy/MM/dd');
}
console.log('');
