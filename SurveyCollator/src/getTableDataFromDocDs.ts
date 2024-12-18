function getTableDataFromDocDs_(
  docId: string,
  responseDate: string
): string[][] {
  const companyName: string | null =
    PropertiesService.getScriptProperties().getProperty('company_ds');
  if (companyName === null) {
    throw new Error('Company name is not set in script properties');
  }
  const doc: GoogleAppsScript.Document.Document = DocumentApp.openById(docId);
  const filename: string = doc.getName();
  const body: GoogleAppsScript.Document.Body = doc.getBody();
  const childrenCount: number = body.getNumChildren();
  let outputTables: string[][] = [];
  let tableTitle: string = '';
  for (let i = 0; i < childrenCount; i++) {
    if (body.getChild(i).getType() === DocumentApp.ElementType.TABLE) {
      const table: GoogleAppsScript.Document.Table = body.getChild(i).asTable();
      if (table.getRow(0).getNumCells() === 3) {
        const tableRows: number = table.getNumRows();
        for (let j = 0; j < tableRows; j++) {
          outputTables.push([
            filename,
            companyName,
            tableTitle,
            table.getCell(j, 1).getText(),
            table.getCell(j, 2).getText(),
            '',
            '',
            responseDate,
          ]);
        }
      }
      tableTitle = '';
    }
    if (body.getChild(i).getType() === DocumentApp.ElementType.PARAGRAPH) {
      tableTitle = body.getChild(i).asParagraph().getText();
    }
  }
  return outputTables;
}
function getTableDataFromDocDs_main() {
  const ds_wk_sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('wk');
  if (ds_wk_sheet === null) {
    throw new Error('Sheet not found');
  }
  const sheet: GoogleAppsScript.Spreadsheet.Sheet = getOutputSheet_();
  const targetFileids: string[][] = ds_wk_sheet
    .getRange(2, 2, ds_wk_sheet.getLastRow() - 1, 1)
    .getValues();
  if (targetFileids.length === 0) {
    throw new Error('No target file found');
  }
  const responseDate: string = '2024-06-xx';
  const tablesList: string[][][] = targetFileids.map(fileId =>
    getTableDataFromDocDs_(fileId[0], responseDate)
  );
  const tables: string[][] = tablesList.flat();
  const outputValues: string[][] = [headers, ...tables];
  sheet.clear();
  sheet
    .getRange(1, 1, outputValues.length, headers.length)
    .setValues(outputValues);
}
