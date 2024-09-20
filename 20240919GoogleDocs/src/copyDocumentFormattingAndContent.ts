function copyDocumentFormattingAndContent(): void {
  // 元のドキュメントを取得
  const sourceDocId: string | null =
    PropertiesService.getScriptProperties().getProperty('sourceDocId');
  if (!sourceDocId) {
    return;
  }

  const sourceDoc: any = Docs.Documents?.get(sourceDocId);
  const sourceBody: any = sourceDoc.body;
  const sourceContent: any[] = sourceBody.content;
  const documentStyle: any = sourceDoc.documentStyle;
  const tempSourceNamedStyles = sourceDoc.namedStyles;
  let styles = Array(tempSourceNamedStyles.styles.length);
  const sortOrderArray: [string, number][] = [
    'TITLE',
    'SUBTITLE',
    'HEADING_1',
    'HEADING_2',
    'HEADING_3',
    'HEADING_4',
    'NORMAL_TEXT',
    'HEADING_5',
    'HEADING_6',
  ].map((x, idx) => [x, idx]);
  const sortOrder: Map<string, number> = new Map(sortOrderArray);
  tempSourceNamedStyles.styles.forEach((style: any) => {
    const index = sortOrder.get(style.namedStyleType);
    if (index !== undefined) {
      styles[index] = style;
    }
  });
  const sourceNamedStyles = { styles };

  const newDoc: any = Docs.Documents?.create({
    title: 'Copied Document',
  });
  const newDocId: string = newDoc.documentId;

  let currentIndex = 1; // 新しいドキュメントの挿入位置を管理

  // 挿入するテキストリクエストを作成
  const insertRequests: any[] = sourceContent
    .filter((element: any) => element.paragraph) // 段落要素をフィルタリング
    .flatMap((element: any) => {
      const paragraphRequests: any[] = [];
      let paragraphTextContent = ''; // 段落全体のテキストを保持

      element.paragraph.elements.forEach((el: any) => {
        const textContent = el.textRun ? el.textRun.content : '';
        paragraphTextContent += textContent; // 段落のテキストを結合

        const insertRequest = {
          insertText: {
            location: {
              index: currentIndex, // 現在の挿入位置を使用
            },
            text: textContent, // 挿入するテキスト
          },
        };
        paragraphRequests.push(insertRequest);
        currentIndex += textContent.length; // 現在の挿入位置を更新
      });

      // 書式を更新するリクエスト
      const updateRequests = element.paragraph.elements.map((el: any) => {
        const textStyle = el.textRun ? el.textRun.textStyle : {};
        const startIndex = currentIndex - paragraphTextContent.length; // 正しいstartIndexを計算
        const endIndex =
          startIndex + (el.textRun ? el.textRun.content.length : 0);
        return {
          updateTextStyle: {
            textStyle: textStyle, // 元のスタイルを使用
            range: {
              startIndex: startIndex,
              endIndex: endIndex,
            },
            fields:
              Object.keys(textStyle).length > 0
                ? Object.keys(textStyle).join(',')
                : '*', // フィールドを指定
          },
        };
      });

      return [...paragraphRequests, ...updateRequests];
    });

  Docs.Documents?.batchUpdate(
    {
      requests: [
        ...insertRequests, // 挿入リクエストを追加
        {
          updateDocumentStyle: {
            documentStyle: {
              ...documentStyle,
              background: undefined, // 背景色を削除
            },
            fields:
              'pageSize,marginTop,marginBottom,marginLeft,marginRight,marginHeader,marginFooter',
          } as any, // updateDocumentStyle の型を any にキャスト
        },
        // 文書全体のフォントをメイリオ10ptに設定
        /*        {
          updateTextStyle: {
            textStyle: {
              weightedFontFamily: {
                fontFamily: 'Meiryo', // フォントをメイリオに設定
                weight: 400, // 通常のフォントウェイト
              },
              fontSize: {
                magnitude: 10, // サイズを10ptに設定
                unit: 'PT',
              },
            },
            range: {
              startIndex: 1,
              endIndex: currentIndex, // 文書の全テキスト範囲を指定
            },
            fields: 'weightedFontFamily,fontSize', // 更新するフィールドを指定
          },
        },*/
      ] as any, // requests 全体を any にキャスト
    },
    newDocId // 新しいドキュメントのID
  );

  const targetInsertRequests = insertRequests.filter(x => x.insertText);
  const textStyleRequests = sourceNamedStyles.styles.map(
    (style: any, idx: number) => {
      const startIndex =
        idx === 0
          ? 1
          : targetInsertRequests[idx - 1].insertText.location.index +
            targetInsertRequests[idx - 1].insertText.text.length; // 前の要素の終了インデックスを取得
      const endIndex =
        startIndex + targetInsertRequests[idx].insertText.text.length; // 各段落が1行であると仮定
      const bold =
        style.textStyle.bold !== undefined ? style.textStyle.bold : false;
      const fontSize =
        style.textStyle.fontSize !== undefined
          ? style.textStyle.fontSize.magnitude
          : 10;
      return {
        updateTextStyle: {
          textStyle: {
            weightedFontFamily: {
              fontFamily: 'Meiryo', // フォントをメイリオに設定
              weight: 400, // 通常のフォントウェイト
            },
            fontSize: {
              magnitude: fontSize,
              unit: 'PT',
            },
            bold: bold,
          },
          range: {
            startIndex: startIndex,
            endIndex: endIndex, // 新しい文書の範囲を指定
          },
          fields: 'fontSize', // フィールドを指定
        },
      };
    }
  );
  if (textStyleRequests.length > 0) {
    Docs.Documents?.batchUpdate(
      {
        requests: textStyleRequests,
      },
      newDocId
    );
  }

  // 元の文書のスタイルを新しい文書に適用
  /*  const paragraphStyleRequests = sourceNamedStyles.styles.map(
    (style: any, idx: number) => {
      const startIndex =
        idx === 0
          ? 1
          : targetInsertRequests[idx - 1].insertText.location.index +
            targetInsertRequests[idx - 1].insertText.text.length; // 前の要素の終了インデックスを取得
      const endIndex = startIndex + 1; // 各段落が1行であると仮定

      return {
        updateParagraphStyle: {
          paragraphStyle: style.paragraphStyle,
          range: {
            startIndex: startIndex,
            endIndex: endIndex, // 新しい文書の範囲を指定
          },
          fields: '*', // フィールドを指定
        },
      };
    }
  );

  if (paragraphStyleRequests.length > 0) {
    Docs.Documents?.batchUpdate(
      {
        requests: paragraphStyleRequests,
      },
      newDocId
    );
  }
  /*
  const namedStyleType = sourceNamedStyles.styles[7].namedStyleType;
  const titleParagraphStyle = sourceNamedStyles.styles[7].paragraphStyle;

  const styleRequests = [
    {
      updateParagraphStyle: {
        paragraphStyle: {
          namedStyleType: 'TITLE',
          alignment: 'CENTER',
        },
        range: {
          startIndex: 1, // 適用する範囲を調整
          endIndex: currentIndex, // 新しい文書の範囲を指定
        },
        fields: 'namedStyleType,alignment', // フィールドを指定
      },
    },
  ];

  if (styleRequests.length > 0) {
    Docs.Documents?.batchUpdate(
      {
        requests: styleRequests,
      },
      newDocId
    );
  }
*/
  console.log('New document created with ID:', newDoc.documentId);
}
