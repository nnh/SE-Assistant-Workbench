function test20250604() {
  const thisSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    '論文修正依頼WoSIDとジャーナルの対応'
  );
  if (!thisSheet) {
    throw new Error('Sheet not found: 論文修正依頼WoSIDとジャーナルの対応');
  }
  const rawJsonSpreadsheetId =
    PropertiesService.getScriptProperties().getProperty('rawJsonSpreadSheetId');
  if (!rawJsonSpreadsheetId) {
    throw new Error('Script property "rawJsonSpreadSheetId" not set');
  }
  const rawJsonSpreadsheet = SpreadsheetApp.openById(rawJsonSpreadsheetId);
  const rawJsonSheetName =
    PropertiesService.getScriptProperties().getProperty('rawJsonSheetName');
  if (!rawJsonSheetName) {
    throw new Error('Script property "rawJsonSheetName" not set');
  }
  const rawJsonSheet = rawJsonSpreadsheet.getSheetByName(rawJsonSheetName);
  if (!rawJsonSheet) {
    throw new Error(`Sheet not found: ${rawJsonSheetName}`);
  }
  const rawJsonData = rawJsonSheet.getDataRange().getValues();
  const rawJsonHeaders = rawJsonData[0];
  const uidColIndex = rawJsonHeaders.indexOf('uid');
  if (uidColIndex === -1) {
    throw new Error('Column "uid" not found in rawJsonHeaders');
  }
  const thisSheetData = thisSheet.getDataRange().getValues();
  const outputHeaders = rawJsonHeaders; // rawJsonSheetの見出しをそのまま使う

  // uid列の値からrawJsonSheetの行データを素早く取得できるようにMapを作成
  const uidToRawRow = new Map();
  for (let i = 1; i < rawJsonData.length; i++) {
    const row = rawJsonData[i];
    const uid = row[uidColIndex];
    uidToRawRow.set(uid, row);
  }

  // 出力用データを作成（1行目は見出し）
  const outputData = [outputHeaders];
  for (let i = 1; i < thisSheetData.length; i++) {
    const aValue = thisSheetData[i][0]; // A列
    const rawRow = uidToRawRow.get(aValue);
    if (rawRow) {
      outputData.push(rawRow);
    } else {
      // 該当なしの場合は空行を出力
      outputData.push(Array(rawJsonHeaders.length).fill(''));
    }
  }

  // H列に出力
  const startRow = 1;
  const startCol = 8; // H列
  thisSheet
    .getRange(startRow, startCol, outputData.length, outputData[0].length)
    .setValues(outputData);
}
