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
