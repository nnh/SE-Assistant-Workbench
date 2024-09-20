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
  const documentNamedStyles: any = sourceDoc.namedStyles;
  const styleList: [string, object][] = documentNamedStyles.styles.map(
    (style: any): [string, object] => [style.namedStyleType, style.textStyle]
  );
  const sourceStyleMap: Map<string, object> = new Map(styleList);
  const newDoc: any = Docs.Documents?.create({
    title: 'Copied Document',
  });
  const newDocId: string = newDoc.documentId;
  Docs.Documents?.batchUpdate(
    {
      requests: [
        {
          insertText: {
            location: {
              index: 1, // テキストを挿入する位置（ドキュメントの最初）
            },
            text: 'test', // 挿入したいテキスト
          },
        },
        {
          updateDocumentStyle: {
            documentStyle: {
              ...documentStyle,
              background: undefined, // 背景色を削除
            },
            fields:
              'pageSize,marginTop,marginBottom,marginLeft,marginRight,marginHeader,marginFooter', // 背景色を除外
          } as any, // updateDocumentStyle の型を any にキャスト
        },
      ] as any, // requests 全体を any にキャスト
    },
    newDocId // 新しいドキュメントのID
  );

  console.log('New document created with ID:', newDoc.documentId);
}
