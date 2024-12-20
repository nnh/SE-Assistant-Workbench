function sheetCheckA() {
  const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('質問票まとめ');
  if (sheet === null) {
    throw new Error('Sheet not found');
  }
  const values = sheet.getDataRange().getValues();
  const targetValues = values
    .filter((_, idx) => idx > 268)
    .map(values => {
      const val1 = values[4].match(/^.*?(\r\n|\n|\r).*?(\r\n|\n|\r|$)/);
      const val2 = values[6].match(/^.*?(\r\n|\n|\r).*?(\r\n|\n|\r|$)/);
      return [values[2], val1 ? val1[0] : '', val2 ? val2[0] : ''];
    });
  const check = targetValues
    .map(([id, val1, val2]) => {
      if (/→/.test(val2) || /→/.test(val1)) {
        return [id, val1, val2];
      }
      if (/はい/.test(val1) && /yes/i.test(val2)) {
        return null;
      }
      if (/いいえ/.test(val1) && /no/i.test(val2)) {
        return null;
      }
      return [id, val1, val2];
    })
    .filter(v => v !== null);
  console.log(check);
}

function getDsFileInfo() {
  const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('wk');
  if (sheet === null) {
    throw new Error('Sheet not found');
  }
  const folderId = PropertiesService.getScriptProperties().getProperty(
    'ds_target_folder_id'
  );
  if (folderId === null) {
    throw new Error('Folder ID is not set in script properties');
  }
  const folder: GoogleAppsScript.Drive.Folder =
    DriveApp.getFolderById(folderId);
  const files: GoogleAppsScript.Drive.FileIterator = folder.getFiles();
  let fileNameAndIds: string[][] = [];
  while (files.hasNext()) {
    const file: GoogleAppsScript.Drive.File = files.next();
    fileNameAndIds.push([file.getName(), file.getId()]);
  }
  sheet.getRange(2, 1, fileNameAndIds.length, 2).setValues(fileNameAndIds);
}
// categoryの値を一意に取得する関数
const getUniqueCategories_ = (outputValues: { category: string }[]) => {
  return Array.from(new Set(outputValues.map(({ category }) => category)));
};
// 使用例
//const uniqueCategories = getUniqueCategories_(outputValues);
