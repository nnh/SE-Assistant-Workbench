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
function getTableDataFromDocA_getInputData_(
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
const combineResponsesByGroupWithSeparatedQuestions_ = (
  outputBodies: {
    group: string;
    category: string;
    englishValues: string;
    japaneseValues: string;
  }[]
): Record<
  string,
  {
    questions: {
      combinedEnglishResponse: string;
      combinedJapaneseResponse: string;
    };
    answers: {
      combinedEnglishResponse: string;
      combinedJapaneseResponse: string;
    };
  }
> => {
  return outputBodies.reduce(
    (acc, { group, category, englishValues, japaneseValues }) => {
      const isQuestion = category === 'Question.';

      // 英語と日本語の値を整形
      const formattedEnglish = isQuestion
        ? englishValues.trim()
        : `${category}:\n${englishValues.trim()}`;
      const formattedJapanese = isQuestion
        ? japaneseValues.trim()
        : `${category}:\n${japaneseValues.trim()}`;

      // グループの初期化
      if (!acc[group]) {
        acc[group] = {
          questions: {
            combinedEnglishResponse: '',
            combinedJapaneseResponse: '',
          },
          answers: {
            combinedEnglishResponse: '',
            combinedJapaneseResponse: '',
          },
        };
      }

      // 分類に応じてレスポンスを追加
      const target = isQuestion ? acc[group].questions : acc[group].answers;

      if (formattedEnglish) {
        target.combinedEnglishResponse = target.combinedEnglishResponse
          ? `${target.combinedEnglishResponse}\n\n${formattedEnglish}`
          : formattedEnglish;
      }

      if (formattedJapanese) {
        target.combinedJapaneseResponse = target.combinedJapaneseResponse
          ? `${target.combinedJapaneseResponse}\n\n${formattedJapanese}`
          : formattedJapanese;
      }

      return acc;
    },
    {} as Record<
      string,
      {
        questions: {
          combinedEnglishResponse: string;
          combinedJapaneseResponse: string;
        };
        answers: {
          combinedEnglishResponse: string;
          combinedJapaneseResponse: string;
        };
      }
    >
  );
};

function getTableDataFromDocA_(
  docId: string,
  responseDate: string,
  companyName: string
): string[][] {
  const doc: GoogleAppsScript.Document.Document = DocumentApp.openById(docId);
  const filename: string = doc.getName();
  const body: GoogleAppsScript.Document.Body = doc.getBody();
  const paragraphs: GoogleAppsScript.Document.Paragraph[] =
    body.getParagraphs();
  const inputBodies: string[][] =
    getTableDataFromDocA_getInputData_(paragraphs);

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
  const groupedResponseBodies: {
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
  const categorizedGroupedResponses: Record<
    string,
    {
      questions: {
        combinedEnglishResponse: string;
        combinedJapaneseResponse: string;
      };
      answers: {
        combinedEnglishResponse: string;
        combinedJapaneseResponse: string;
      };
    }
  > = combineResponsesByGroupWithSeparatedQuestions_(groupedResponseBodies);
  let outputBodies: string[][] = [];
  for (const [group, { questions, answers }] of Object.entries(
    categorizedGroupedResponses
  )) {
    outputBodies.push([
      filename,
      companyName,
      group,
      questions.combinedJapaneseResponse,
      answers.combinedJapaneseResponse,
      questions.combinedEnglishResponse,
      answers.combinedEnglishResponse,
      responseDate,
    ]);
  }
  return outputBodies;
}
