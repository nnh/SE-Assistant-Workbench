function checkContent_splitLanguage() {
  const getTargetProperties: GetTargetProperties = new GetTargetProperties();
  const checkJpDocId: string = getTargetProperties.getProperty_(
    'check_splitLanguagejpDocId'
  );
  const testFolderId: string = getTargetProperties.getProperty_('testFolderId');
  const testFolder: GoogleAppsScript.Drive.Folder =
    DriveApp.getFolderById(testFolderId);
  const testFolderFiles: GoogleAppsScript.Drive.FileIterator =
    testFolder.getFiles();
  let targetDocJpParagraphs: string[] = [];
  while (testFolderFiles.hasNext()) {
    const file: GoogleAppsScript.Drive.File = testFolderFiles.next();
    if (file.getName() === `${documentHeader}${splitLanguage}jp`) {
      const targetDocJp: GoogleAppsScript.Document.Document = getDocument_(
        file.getId()
      );
      targetDocJpParagraphs = filterNonEmptyStrings_(
        getParagraphTexts_(targetDocJp)
      );
    }
    if (targetDocJpParagraphs.length > 0) {
      break;
    }
  }
  const checkJpDoc: GoogleAppsScript.Document.Document =
    getDocument_(checkJpDocId);
  const checkJpParagraphs: string[] = filterNonEmptyStrings_(
    getParagraphTexts_(checkJpDoc)
  );
  compareContent_(targetDocJpParagraphs, checkJpParagraphs);
  console.log('日英分割（日本語）テストOK');
}
function filterNonEmptyStrings_(texts: string[]): string[] {
  return texts
    .filter(text => text !== '')
    .filter(text => !new RegExp(/^\r$/).test(text));
}
function compareContent_(targetTexts: string[], checkTexts: string[]): void {
  if (targetTexts.length !== checkTexts.length) {
    console.log('The number of paragraphs is different.');
  }
  targetTexts.forEach((targetText, idx) => {
    if (targetText.trim() !== checkTexts[idx].trim()) {
      console.log(idx);
      console.log(`"${targetText}"`);
      console.log([...targetText].map(char => char.charCodeAt(0)));
      console.log(`"${checkTexts[idx]}"`);
      console.log([...checkTexts[idx]].map(char => char.charCodeAt(0)));
      throw new Error('The paragraph is different.');
    }
  });
}
function getParagraphTexts_(doc: GoogleAppsScript.Document.Document): string[] {
  const body: GoogleAppsScript.Document.Body = doc.getBody();
  const result: string[] = body
    .getParagraphs()
    .map(paragraph => paragraph.getText());
  // Bodyの全てのテキストが取得できていることを確認する
  const bodyText = body.getText().replace(/\s+/g, '');
  const paragraphTexts = result.join('').replace(/\s+/g, '');
  if (paragraphTexts !== bodyText) {
    throw new Error('Failed to get all paragraph texts.');
  }
  return result;
}

/*
function checkContent() {
  const targetId: string = getProperty_(testDocId);
  const targetDoc: GoogleAppsScript.Document.Document = getDocument_(targetId);
  const body: GoogleAppsScript.Document.Body = targetDoc.getBody();
  const paragraphs: GoogleAppsScript.Document.Paragraph[] =
    body.getParagraphs();
  paragraphs.forEach((paragraph, idx) => {
    const paragraphText: string = paragraph.getText();
    if (paragraphText !== checkTextArray[idx]) {
      if (
        paragraphText.replace('\\', '').replace('\\', '') !==
        checkTextArray[idx]
      ) {
        console.log(paragraphText);
        console.log(checkTextArray[idx]);
        throw new Error('Error: ' + paragraphText);
      }
    }
  });
  console.log('check ok.');
}

const checkTextArray: string[] = [];
*/
