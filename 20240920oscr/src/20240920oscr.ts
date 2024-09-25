function main(): void {
  const parentFolderId: string | null =
    PropertiesService.getScriptProperties().getProperty('parentFolderId');
  if (parentFolderId === null) {
    throw new Error('No parentFolderId');
  }
  const dcFolderId: string | null =
    PropertiesService.getScriptProperties().getProperty('dcFolderId');
  if (dcFolderId === null) {
    throw new Error('No dcFolderId');
  }
  const otherFolderId: string | null =
    PropertiesService.getScriptProperties().getProperty('otherFolderId');
  if (otherFolderId === null) {
    throw new Error('No otherFolderId');
  }
  const targetFolders: GoogleAppsScript.Drive.Folder[] = [
    parentFolderId,
    dcFolderId,
    otherFolderId,
  ].map(x => DriveApp.getFolderById(x));
  if (targetFolders.some(x => x === null)) {
    throw new Error('No target folder');
  }
  const [parentFolder, dcFolder, otherFolder] = targetFolders;
  const dcAndOtherFolders: GoogleAppsScript.Drive.Folder[] = [
    dcFolder,
    otherFolder,
  ]
    .map(getFolders_)
    .flat();
  const inputFolders: GoogleAppsScript.Drive.Folder[] = [
    parentFolder,
    ...dcAndOtherFolders,
  ];
  const targetFilesInfo: string[][][] = inputFolders.map(x => getFiles_(x));
  const spreadsheetId: string | null =
    PropertiesService.getScriptProperties().getProperty('testSsId');
  if (spreadsheetId === null) {
    throw new Error('No spreadsheetId');
  }
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(spreadsheetId);
  modSpreadSheet_(spreadsheet);
}
function getFiles_(folder: GoogleAppsScript.Drive.Folder): string[][] {
  const folderId: string = folder.getId();
  const folderName: string = folder.getName();
  const files: GoogleAppsScript.Drive.FileIterator = folder.getFiles();
  const filesArray: GoogleAppsScript.Drive.File[] = [];
  while (files.hasNext()) {
    filesArray.push(files.next());
  }
  const res: string[][] = filesArray.map(x => {
    const fileId: string = x.getId();
    const fileName: string = x.getName();
    return [folderId, folderName, fileId, fileName];
  });
  return res;
}
function getFolders_(
  folder: GoogleAppsScript.Drive.Folder
): GoogleAppsScript.Drive.Folder[] {
  const folders: GoogleAppsScript.Drive.FolderIterator = folder.getFolders();
  const foldersArray: GoogleAppsScript.Drive.Folder[] = [];
  while (folders.hasNext()) {
    foldersArray.push(folders.next());
  }
  return foldersArray;
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
  // 年度のプルダウンリストを再作成
  createDropdown_(targetSheet.getRange('D1'));
  // 控除時間を追加
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
function updateDropdown_(range: GoogleAppsScript.Spreadsheet.Range): void {
  range.clearDataValidations();
  createDropdown_(range);
}

function createDropdown_(range: GoogleAppsScript.Spreadsheet.Range): void {
  // 2023から2033までの数値を作成
  const years = Array.from({ length: 11 }, (_, i) => (2023 + i).toString());

  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(years, true) // プルダウンリストを作成
    .build();
  range.setDataValidation(rule);
}
