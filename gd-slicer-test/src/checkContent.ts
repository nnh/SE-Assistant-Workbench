function checkContent_splitLanguage() {
  const targetLanguages: string[] = ['jp', 'en'];
  const getTargetProperties: GetTargetProperties = new GetTargetProperties();
  const checkDocIdMap: Map<string, string> = new Map();
  targetLanguages.forEach(language => {
    const targetDocId: string = getTargetProperties.getProperty_(
      `check_splitLanguageDocId_${language}`
    );
    checkDocIdMap.set(language, targetDocId);
  });
  const testFolderId: string = getTargetProperties.getProperty_('testFolderId');
  const docFetcher: DocFetcher = new DocFetcher();
  const targetDocParagraphMap: Map<string, string[]> = new Map();
  const checkDocParagraphMap: Map<string, string[]> = new Map();
  targetLanguages.forEach(language => {
    const targetDocParagraphs: string[] = getSplitLanguageText_(
      `${documentHeader}${splitLanguage}${language}`,
      testFolderId
    );
    const checkDocParagraphs: string[] = filterNonEmptyStrings_(
      docFetcher.getParagraphTextsByDocId_(checkDocIdMap.get(language)!)
    );
    targetDocParagraphMap.set(language, targetDocParagraphs);
    checkDocParagraphMap.set(language, checkDocParagraphs);
  });
  targetLanguages.forEach(language => {
    compareContent_(
      targetDocParagraphMap.get(language)!,
      checkDocParagraphMap.get(language)!
    );
    console.log(`The content of ${language} is the same.`);
  });
}

function getSplitLanguageText_(docName: string, folderId: string): string[] {
  const docFetcher: DocFetcher = new DocFetcher();
  const targetDoc: GoogleAppsScript.Document.Document =
    docFetcher.getDocumentByName_(docName, folderId);
  const targetDocParagraphs: string[] = filterNonEmptyStrings_(
    docFetcher.getParagraphTexts_(targetDoc)
  );
  return targetDocParagraphs;
}
function filterNonEmptyStrings_(texts: string[]): string[] {
  return texts
    .filter(text => text.trim() !== '')
    .filter(text => !new RegExp(/^\r$/).test(text.trim()));
}

function compareContent_(targetTexts: string[], checkTexts: string[]): void {
  if (targetTexts.length !== checkTexts.length) {
    console.log('The number of paragraphs is different.');
  }
  targetTexts.forEach((targetText, idx) => {
    if (targetText.trim() !== checkTexts[idx].trim()) {
      console.log(idx);
      console.log(`"${targetText}"`);
      //console.log([...targetText].map(char => char.charCodeAt(0)));
      console.log(`"${checkTexts[idx]}"`);
      //console.log([...checkTexts[idx]].map(char => char.charCodeAt(0)));
      throw new Error('The paragraph is different.');
    }
  });
}
