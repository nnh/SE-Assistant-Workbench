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
        {
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
        },
      ] as any, // requests 全体を any にキャスト
    },
    newDocId // 新しいドキュメントのID
  );

  console.log('New document created with ID:', newDoc.documentId);
}
