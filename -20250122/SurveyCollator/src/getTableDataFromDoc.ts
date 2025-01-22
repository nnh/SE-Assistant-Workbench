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

function getOutputSheet_(): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('output');
  if (sheet === null) {
    throw new Error('Sheet not found');
  }
  return sheet;
}

function main() {
  getTableDataFromDocDs_main();
  getTableDataFromDocA_main();
}
