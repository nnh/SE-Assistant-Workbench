const isEnglishOnly_ = (text: string): boolean => /^[\x20-\x7E]+$/.test(text);

function groupValuesByCategory_(inputBodies: string[][]): Record<
  string,
  {
    group: string;
    category: string;
    english: string[];
    japanese: string[];
  }
> {
  const groupedResults: Record<
    string,
    {
      group: string;
      category: string;
      english: string[];
      japanese: string[];
    }
  > = inputBodies.reduce(
    (acc, [group, value, category]) => {
      const key = `${group}-${category}`;
      if (!acc[key]) {
        acc[key] = { group, category, english: [], japanese: [] };
      }
      if (isEnglishOnly_(value)) {
        acc[key].english.push(value); // 英語のみ
      } else {
        acc[key].japanese.push(value); // 日本語と英語が混在
      }
      return acc;
    },
    {} as Record<
      string,
      { group: string; category: string; english: string[]; japanese: string[] }
    >
  );
  return groupedResults;
}
function getTableDataFromDocA_getInputData(
  paragraphs: GoogleAppsScript.Document.Paragraph[]
): string[][] {
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
      key = paragraph
        .getText()
        .replace(/^\d+(\.\d+)*\.\s/, '')
        .replace(/．$/, '.');
    }
    if (paragraph.getHeading() === DocumentApp.ParagraphHeading.NORMAL) {
      if (paragraph.getText() !== '' && key !== '') {
        values.push([tableTitle, paragraph.getText(), key]);
      }
    }
  }
  const inputBodies: string[][] = outputTables.filter(
    ([tableTitle, _1, _2]) => tableTitle !== ''
  );
  return inputBodies;
}
function getTableDataFromDocA_(
  docId: string,
  responseDate: string
): string[][] {
  const doc: GoogleAppsScript.Document.Document = DocumentApp.openById(docId);
  const filename: string = doc.getName();
  const body: GoogleAppsScript.Document.Body = doc.getBody();
  const paragraphs: GoogleAppsScript.Document.Paragraph[] =
    body.getParagraphs();
  const inputBodies: string[][] = getTableDataFromDocA_getInputData(paragraphs);

  // グループとカテゴリごとに値を処理
  const groupedResults: Record<
    string,
    {
      group: string;
      category: string;
      english: string[];
      japanese: string[];
    }
  > = groupValuesByCategory_(inputBodies);
  const outputBodies: {
    group: string;
    category: string;
    englishValues: string;
    japaneseValues: string;
  }[] = Object.values(groupedResults).map(
    ({ group, category, english, japanese }) => ({
      group,
      category,
      englishValues: english.join('\n'),
      japaneseValues: japanese.join('\n'),
    })
  );
  const categoryConstants: string[] = [
    'Question.',
    'Answer.',
    'Requires Action.',
    '回答.',
  ];
  let questionJapanese: string = '';
  let questionEnglish: string = '';
  let answerJapanese: string = '';
  let answerEnglish: string = '';
  for (let i = 0; i < outputBodies.length; i++) {
    const item: {
      group: string;
      category: string;
      englishValues: string;
      japaneseValues: string;
    } = outputBodies[i];
    if (item.category === 'Question.') {
      questionEnglish = item.englishValues;
    }
    if (item.category === '回答.') {
      answerJapanese = item.japaneseValues;
    }
  }

  const outputValues = outputBodies.map(
    ({ group, category, englishValues, japaneseValues }) => {
      const result = [filename, 'kaisyamei', group, questionJapanese];
    }
  );
  const result: string[][] = [headers];
  return result;
}
