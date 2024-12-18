const headers: string[] = [
  'Filename',
  'Company',
  'Title',
  'Question(Japanese)',
  'Answer(Japanese)',
  'Question(English)',
  'Answer(English)',
];
function getTableDataFromDocA() {
  const docId: string = '';
  const doc: GoogleAppsScript.Document.Document = DocumentApp.openById(docId);
  const filename: string = doc.getName();
  const body: GoogleAppsScript.Document.Body = doc.getBody();
  const paragraphs: GoogleAppsScript.Document.Paragraph[] =
    body.getParagraphs();

  let outputTables: string[][] = [];
  let tableTitle: string = '';
  let key: string = '';
  let values: string[][] = [];
  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i];

    if (paragraph.getHeading() === DocumentApp.ParagraphHeading.HEADING3) {
      if (values.length > 0) {
        outputTables.push(...values);
      }
      tableTitle = paragraph.getText();
      values = [];
    }
    if (paragraph.getHeading() === DocumentApp.ParagraphHeading.HEADING4) {
      key = paragraph.getText().replace(/^\d+(\.\d+)*\.\s/, '');
    }
    if (paragraph.getHeading() === DocumentApp.ParagraphHeading.NORMAL) {
      if (paragraph.getText() !== '' && key !== '') {
        values.push([tableTitle, paragraph.getText(), key]);
      }
    }
  }
  const outputBody: string[][] = outputTables.filter(
    ([tableTitle, _1, _2]) => tableTitle !== ''
  );
  console.log(0);
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

function main() {
  const ds_wk_sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('wk');
  if (ds_wk_sheet === null) {
    throw new Error('Sheet not found');
  }
  const targetFileids: string[][] = ds_wk_sheet
    .getRange(2, 2, ds_wk_sheet.getLastRow() - 1, 1)
    .getValues();
  const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('output');
  if (sheet === null) {
    throw new Error('Sheet not found');
  }
  const tablesList: string[][][] = targetFileids.map(fileId =>
    getTableDataFromDocDs_(fileId[0])
  );
  const tables: string[][] = tablesList.flat();
  const outputValues: string[][] = [headers, ...tables];
  sheet.clear();
  sheet
    .getRange(1, 1, outputValues.length, headers.length)
    .setValues(outputValues);
}
