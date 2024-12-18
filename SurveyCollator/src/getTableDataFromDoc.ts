const headers: string[] = [
  'Filename',
  'Company',
  'Title',
  'Question(Japanese)',
  'Answer(Japanese)',
  'Question(English)',
  'Answer(English)',
  'Response Date',
];
function getTableDataFromDocA_main(): void {
  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet = getOutputSheet_();
  const companyName: string | null =
    PropertiesService.getScriptProperties().getProperty('company_a');
  if (companyName === null) {
    throw new Error('Company name is not set in script properties');
  }
  const aPropertyHead: string = 'a_target_file_id_';
  const aPropertyKeys: string[] = PropertiesService.getScriptProperties()
    .getKeys()
    .filter(key => key.includes(aPropertyHead));
  if (aPropertyKeys.length === 0) {
    throw new Error('No target file found');
  }
  const targetDocIds: string[] = aPropertyKeys
    .map(key => PropertiesService.getScriptProperties().getProperty(key))
    .filter((property): property is string => property !== null);
  targetDocIds.forEach(docId => {
    const responseDate: string =
      PropertiesService.getScriptProperties().getProperty('a_target_file_id_1')
        ? '2023-02-xx'
        : '';
    const outputBodies: string[][] = getTableDataFromDocA_(
      docId,
      responseDate,
      companyName
    );
    const lastRow: number = outputSheet.getLastRow();
    const outputValues: string[][] =
      lastRow === 0 ? [headers, ...outputBodies] : outputBodies;
    const startRow: number = lastRow + 1;
    outputSheet
      .getRange(startRow, 1, outputValues.length, headers.length)
      .setValues(outputValues);
  });
}

function getTableDataFromDocDs_(docId: string): string[][] {
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
function getOutputSheet_(): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('output');
  if (sheet === null) {
    throw new Error('Sheet not found');
  }
  return sheet;
}

function main() {
  const ds_wk_sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('wk');
  if (ds_wk_sheet === null) {
    throw new Error('Sheet not found');
  }
  const targetFileids: string[][] = ds_wk_sheet
    .getRange(2, 2, ds_wk_sheet.getLastRow() - 1, 1)
    .getValues();

  const tablesList: string[][][] = targetFileids.map(fileId =>
    getTableDataFromDocDs_(fileId[0])
  );
  const sheet: GoogleAppsScript.Spreadsheet.Sheet = getOutputSheet_();
  const tables: string[][] = tablesList.flat();
  const outputValues: string[][] = [headers, ...tables];
  sheet.clear();
  sheet
    .getRange(1, 1, outputValues.length, headers.length)
    .setValues(outputValues);
}
