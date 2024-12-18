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
