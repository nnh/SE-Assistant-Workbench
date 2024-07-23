function main() {
  const folderId =
    PropertiesService.getScriptProperties().getProperty('csvFolderId');
  const csvFolder = DriveApp.getFolderById(folderId);

  const files = csvFolder.getFiles();
  let outputArray = [];
  const header = [
    'repository',
    'files',
    'language',
    'blank',
    'comment',
    'code',
    'filler',
  ];
  outputArray = [header];

  while (files.hasNext()) {
    const file = files.next();

    // ファイルの拡張子が .csv かどうかを確認
    if (file.getMimeType() === MimeType.CSV) {
      // ファイルの内容を読み込み
      const filename = file.getName();
      const csvContent = file.getBlob().getDataAsString();
      const csvData = Utilities.parseCsv(csvContent);

      // ファイル名を各行に追加してoutputArrayに蓄積
      const res = csvData
        .map(x => [filename, ...x])
        .filter((_, idx) => idx > 0);
      outputArray = [...outputArray, ...res];
    }
  }
  const outputArrayJs = outputArray.filter(
    (x, idx) => idx === 0 || x[2] === 'JavaScript' || x[2] === 'TypeScript'
  );
  const spreadsheet = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('spreadsheetId')
  );
  const sheet = spreadsheet.getSheets()[0];
  sheet.clear();
  sheet
    .getRange(1, 1, outputArrayJs.length, outputArrayJs[0].length)
    .setValues(outputArrayJs);
}
