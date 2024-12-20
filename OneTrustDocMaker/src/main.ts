const inputColumnIndex = new Map<string, number>([
  ['question_ja', 0],
  ['question_en', 10],
  ['description_ja', 1],
  ['description_en', 11],
  ['questionType', 7],
  ['draftAnswer_ja', 8],
  ['ReferenceURL', 9],
  ['key', 16],
  ['keyValue', 17],
  ['itemNumber', 18],
]);
function main() {
  const targetDocs: {
    inputSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
    outputDocument: GoogleAppsScript.Document.Document;
  } = getTargetDocs_();
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet = getInputSheet_(
    targetDocs.inputSpreadsheet
  );
  const targetValues: string[][] = getTargetValuesFromInputSheet_(inputSheet);
  setOutputValuesToOutputDocument_(targetValues, targetDocs.outputDocument);
}
function setOutputValuesToOutputDocument_(
  inputValues: string[][],
  outputDocument: GoogleAppsScript.Document.Document
) {
  const outputBody = outputDocument.getBody();
  outputBody.clear();
  // 配列の各要素を処理
  inputValues.forEach((row, idx, arr) => {
    if (idx === 0) {
      return;
    }
    if (
      row[inputColumnIndex.get('key')!] !==
      arr[idx - 1][inputColumnIndex.get('key')!]
    ) {
      const key = outputBody.appendParagraph(row[inputColumnIndex.get('key')!]);
      key.setHeading(DocumentApp.ParagraphHeading.HEADING1); // 見出し1を設定
    }
    const question = outputBody.appendParagraph(
      `${row[inputColumnIndex.get('question_ja')!]}\n${row[inputColumnIndex.get('question_en')!]}`
    );
    question.setHeading(DocumentApp.ParagraphHeading.HEADING2); // 見出し2を設定
    if (row[inputColumnIndex.get('description_en')!] !== '') {
      const descriptionTitle = outputBody.appendParagraph('説明');
      descriptionTitle.setHeading(DocumentApp.ParagraphHeading.HEADING3); // 見出し3を設定
      const description = outputBody.appendParagraph(
        `${row[inputColumnIndex.get('description_ja')!]}\n${row[inputColumnIndex.get('description_en')!]}`
      );
    }
    const questionTypeTitle = outputBody.appendParagraph('質問タイプ');
    questionTypeTitle.setHeading(DocumentApp.ParagraphHeading.HEADING3); // 見出し3を設定
    const questionType = outputBody.appendParagraph(
      row[inputColumnIndex.get('questionType')!]
    );
    const draftAnswerTitle = outputBody.appendParagraph('回答案');
    draftAnswerTitle.setHeading(DocumentApp.ParagraphHeading.HEADING3); // 見出し3を設定
    const draftAnswer = outputBody.appendParagraph(
      row[inputColumnIndex.get('draftAnswer_ja')!]
    );
    const referenceURLTitle = outputBody.appendParagraph('参考URL等');
    referenceURLTitle.setHeading(DocumentApp.ParagraphHeading.HEADING3); // 見出し3を設定
    const referenceURL = outputBody.appendParagraph(
      row[inputColumnIndex.get('ReferenceURL')!]
    );
    if (idx % 10 === 0) {
      outputDocument.saveAndClose();
      Utilities.sleep(1000);
      outputDocument = DocumentApp.openById(outputDocument.getId());
    }
  });
}
function getItemNumber_(inputValues: string[][]) {
  const itemNumber: string[] = inputValues.map((row, idx) => {
    if (idx === 0) {
      return 'itemNumber';
    }
    const result: RegExpMatchArray | null =
      row[inputColumnIndex.get('question_en')!].match(/^[0-9\.]+\s/);
    if (result === null) {
      return '';
    }
    return result[0];
  });
  const result: string[][] = inputValues.map((row, idx) => [
    ...row,
    itemNumber[idx],
  ]);
  return result;
}
function getTargetValuesFromInputSheet_(
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): string[][] {
  const inputValues: string[][] = inputSheet
    .getRange(7, 1, inputSheet.getLastRow(), inputSheet.getLastColumn())
    .getValues();
  const inputValuesAndKeyQuestions: string[][] =
    getInputValuesAndKeyQuestions_(inputValues);
  const inputValuesAndKeyQuestionsAndItemNumber: string[][] = getItemNumber_(
    inputValuesAndKeyQuestions
  );
  return inputValuesAndKeyQuestionsAndItemNumber;
}
function getInputValuesAndKeyQuestions_(inputValues: string[][]): string[][] {
  // 質問の大項目を取得する
  const inputKeyQuestions: [string, string][] = inputValues.map(row =>
    extractBracketedValue_(
      row[inputColumnIndex.get('question_en')!],
      row[inputColumnIndex.get('question_ja')!]
    )
  );
  let keyQuestions: [string, string][] = [...inputKeyQuestions];
  for (let i = 1; i < keyQuestions.length; i++) {
    if (keyQuestions[i][0] === '') {
      keyQuestions[i][0] = keyQuestions[i - 1][0];
      keyQuestions[i][1] = keyQuestions[i - 1][1];
    }
  }
  keyQuestions[0][0] = 'key';
  keyQuestions[0][1] = 'keyValue';
  const combinedData: string[][] = inputValues.map((row, idx) => [
    ...row, // inputValuesの行
    ...keyQuestions[idx], // keyQuestionsの行
  ]);
  return combinedData;
}

function extractBracketedValue_(
  input_en: string,
  input_ja: string
): [string, string] {
  const match = input_en.match(/\[(.*?)\]/);
  const key = match ? match[1] : null;
  if (key === null) {
    return ['', ''];
  }
  return [key, `${input_en}\n${input_ja}`];
}
function getInputSheet_(
  inputSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheetName =
    PropertiesService.getScriptProperties().getProperty('inputSheetName');
  if (sheetName === null) {
    throw new Error('inputSheetName is not set.');
  }
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    inputSpreadsheet.getSheetByName(sheetName);
  if (inputSheet === null) {
    throw new Error('inputSheet is not found.');
  }
  return inputSheet;
}
function getTargetDocs_(): {
  inputSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;
  outputDocument: GoogleAppsScript.Document.Document;
} {
  const inputSsid: string | null =
    PropertiesService.getScriptProperties().getProperty('inputSsId');
  if (inputSsid === null) {
    throw new Error('inputSsId is not set.');
  }
  const outputDocId: string | null =
    PropertiesService.getScriptProperties().getProperty('outputDocId');
  if (outputDocId === null) {
    throw new Error('outputDocId is not set.');
  }
  const inputSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.openById(inputSsid);
  if (inputSpreadsheet === null) {
    throw new Error('inputSpreadsheet is not found.');
  }
  const outputDocument: GoogleAppsScript.Document.Document =
    DocumentApp.openById(outputDocId);
  if (outputDocument === null) {
    throw new Error('outputDocument is not found.');
  }
  return { inputSpreadsheet, outputDocument };
}
