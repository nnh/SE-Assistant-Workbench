let saveTexts: string[] = [];
function checkContents(): void {
  checkContent_splitLanguage();
  checkContent_splitMultipleLanguage();
}
function checkContent_splitMultipleLanguage(): void {
  const targetLanguages: string[] = ['_2', '_3', '_4', '_5'];
  checkContent_splitLanguage_(targetLanguages, splitMultipleLanguage);
}
function checkContent_splitLanguage(): void {
  const targetLanguages: string[] = ['jp', 'en'];
  checkContent_splitLanguage_(targetLanguages, splitLanguage);
}

function compareAttributes_(
  doc1: GoogleAppsScript.Document.Document,
  doc2: GoogleAppsScript.Document.Document
): void {
  const attributeProperties: string[] = [
    'BACKGROUND_COLOR',
    'BOLD',
    'BORDER_COLOR',
    'BORDER_WIDTH',
    'CODE',
    'FONT_FAMILY',
    'FONT_SIZE',
    'FOREGROUND_COLOR',
    'HEADING',
    'HEIGHT',
    'HORIZONTAL_ALIGNMENT',
    'INDENT_END',
    'INDENT_FIRST_LINE',
    'INDENT_START',
    'ITALIC',
    'GLYPH_TYPE',
    'LEFT_TO_RIGHT',
    'LINE_SPACING',
    'LINK_URL',
    'LIST_ID',
    'MARGIN_BOTTOM',
    'MARGIN_LEFT',
    'MARGIN_RIGHT',
    'MARGIN_TOP',
    'NESTING_LEVEL',
    'MINIMUM_HEIGHT',
    'PADDING_BOTTOM',
    'PADDING_LEFT',
    'PADDING_RIGHT',
    'PADDING_TOP',
    'PAGE_HEIGHT',
    'PAGE_WIDTH',
    'SPACING_AFTER',
    'SPACING_BEFORE',
    'STRIKETHROUGH',
    'UNDERLINE',
    'VERTICAL_ALIGNMENT',
    'WIDTH',
  ];
  const doc1Body: GoogleAppsScript.Document.Body = doc1.getBody();
  const doc2Body: GoogleAppsScript.Document.Body = doc2.getBody();
  if (doc1Body.getNumChildren() !== doc2Body.getNumChildren()) {
    throw new Error('The number of children is different.');
  }
  for (let i = 0; i < doc1Body.getNumChildren(); i++) {
    const child1: GoogleAppsScript.Document.Element = doc1Body.getChild(i);
    const child2: GoogleAppsScript.Document.Element = doc2Body.getChild(i);
    if (child1.getType() !== child2.getType()) {
      throw new Error('The type of children is different.');
    }
    if (child1.getType() === DocumentApp.ElementType.PARAGRAPH) {
      const paragraph1: GoogleAppsScript.Document.Paragraph =
        child1.asParagraph();
      const paragraph2: GoogleAppsScript.Document.Paragraph =
        child2.asParagraph();
      const attributes1: { [key: string]: any } = paragraph1.getAttributes();
      const attributes2: { [key: string]: any } = paragraph2.getAttributes();
      const res = attributeProperties.map(property => {
        if (attributes1[property] !== attributes2[property]) {
          return property;
        } else {
        }
        return null;
      });
      if (res.filter(e => e !== null).length > 0) {
        console.log(i);
        console.log(saveTexts[saveTexts.length - 1]);
        console.log(res.filter(e => e !== null).join(','));
        console.log(JSON.stringify(attributes1));
        console.log(JSON.stringify(attributes2));
        throw new Error('The attributes are different.');
      } else {
        saveTexts.push(paragraph1.getText());
      }
    } else {
      console.log('This child is not paragraph.');
      console.log(child1.getType().toString());
    }
  }
}
function checkContent_splitLanguage_(
  targetLanguages: string[],
  documentNameBody: string
): void {
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
  const targetDocMap: Map<string, GoogleAppsScript.Document.Document> =
    new Map();
  const checkDocMap: Map<string, GoogleAppsScript.Document.Document> =
    new Map();
  targetLanguages.forEach(language => {
    const targetDocParagraphs: string[] = getSplitLanguageText_(
      `${documentHeader}${documentNameBody}`,
      testFolderId,
      language
    );
    const targetDoc: GoogleAppsScript.Document.Document =
      docFetcher.getDocumentByName_(
        `${documentHeader}${documentNameBody}${language}`,
        testFolderId
      );
    const checkDoc: GoogleAppsScript.Document.Document =
      docFetcher.getDocument_(checkDocIdMap.get(language)!);
    targetDocMap.set(language, targetDoc);
    checkDocMap.set(language, checkDoc);
    const checkDocParagraphs: string[] =
      language !== 'jp' && language !== 'en'
        ? filterNonEmptyStrings_(
            docFetcher.getParagraphTextsByDocId_(checkDocIdMap.get(language)!)
          )
        : docFetcher.getParagraphTextsByDocId_(checkDocIdMap.get(language)!);
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
  targetLanguages.forEach(language => {
    compareAttributes_(targetDocMap.get(language)!, checkDocMap.get(language)!);
    console.log(`The attributes of ${language} are the same.`);
  });
}

function getSplitLanguageText_(
  docName: string,
  folderId: string,
  language: string
): string[] {
  const docFetcher: DocFetcher = new DocFetcher();
  const targetDoc: GoogleAppsScript.Document.Document =
    docFetcher.getDocumentByName_(`${docName}${language}`, folderId);
  const targetDocParagraphs: string[] =
    language !== 'jp' && language !== 'en'
      ? filterNonEmptyStrings_(docFetcher.getParagraphTexts_(targetDoc))
      : docFetcher.getParagraphTexts_(targetDoc);
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
