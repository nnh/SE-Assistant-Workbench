function main(): void {
  const sheetIdColNumber: number = 3;
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const sheetIdList: string[] = inputSheet
    .getRange(1, sheetIdColNumber, inputSheet.getLastRow(), 1)
    .getValues()
    .flat();
  sheetIdList.forEach(sheetId => execModSpreadSheet_(sheetId));
}
function execModSpreadSheet_(spreadsheetId: string): void {
  const spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(spreadsheetId);
  if (spreadsheet === null) {
    throw new Error('No spreadsheet');
  }
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
  updateDropdown_(targetSheet.getRange('D1'));
  // 控除時間を追加
  const setText: string = '不足時間';
  if (targetSheet.getRange('K43').getValue() === setText) {
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
  targetSheet.getRange('K43').setValue(setText);
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
function getTargetFileInfo(): void {
  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  outputSheet.clear();
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
  const parentFolderList: string[][] = getFiles_(parentFolder);
  const dcAndOtherFolderList: string[][] = dcAndOtherFolders
    .map(x => getFiles_(x))
    .flat();
  const targetFilesInfo: string[][] = [
    ...parentFolderList,
    ...dcAndOtherFolderList,
  ];
  const targets: string[][] = targetFilesInfo
    .map(x => {
      const [folderId, folderName, fileId, fileName] = x;
      if (/勤務時間計算表原本.*$/.test(fileName)) {
        return x;
      }
      const filename = `^[0-9]{4}.*${folderName}.*$`;
      if (new RegExp(filename).test(fileName)) {
        return x;
      }
      return null;
    })
    .filter(x => x !== null);
  const targetFolderIdList: string[] = Array.from(
    new Set(targets.map(x => x[0]))
  );
  const outputValues: string[][] = targetFolderIdList
    .map(folderId => {
      const temp: string[][] = targets.filter(([x]) => x === folderId);
      const years: number[] = temp
        .map(([, , , fileName]) => {
          if (fileName === null) {
            return null;
          }
          const year = fileName.match(/^[0-9]{4}/);
          if (year === null) {
            return null;
          }
          return Number(year[0]);
        })
        .filter((x): x is number => x !== null);
      if (years.length === 0) {
        return temp;
      }
      const maxYear: number = Math.max(...years);
      const res: string[][] = temp.filter(([, folderName, , fileName]) =>
        new RegExp(`^${maxYear}.*${folderName}.*$`).test(fileName)
      );
      return res;
    })
    .flat();
  outputSheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}
