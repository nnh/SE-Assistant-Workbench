import { getRootFolder_ } from './folderUtils';
import { getSearchExcludeFolderIds_ } from './folderUtils';
/**
 * 指定したルートフォルダ配下を再帰的に走査し、
 * 「Webに公開」されているファイルのみをスプレッドシートに書き出します。
 */
export function exportPublishedFilesRecursive_() {
  let processedAllCount = 0;
  const rootFolder = getRootFolder_(); // 既存の共通関数と想定
  const excludeFolderIds = getSearchExcludeFolderIds_(); // 既存の共通関数と想定

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const SHEET_NAME_PUBLISHED = 'Web公開済みファイル一覧';
  const resultSheet =
    ss.getSheetByName(SHEET_NAME_PUBLISHED) ||
    ss.insertSheet(SHEET_NAME_PUBLISHED);

  // ヘッダーの設定
  const header = [['パス', 'ファイル名', 'ID', 'URL', '最終更新']];
  resultSheet.getRange(1, 1, 1, header[0].length).setValues(header);

  /**
   * 結果の書き出し
   */
  const flushBatch = (outputValues: (string | number | boolean)[][]) => {
    if (outputValues.length > 0) {
      resultSheet
        .getRange(
          resultSheet.getLastRow() + 1,
          1,
          outputValues.length,
          outputValues[0].length
        )
        .setValues(outputValues);
      processedAllCount += outputValues.length;
      SpreadsheetApp.flush();
    }
  };

  /**
   * フォルダを再帰的に走査
   */
  const processFolder = (
    folder: GoogleAppsScript.Drive.Folder,
    path: string
  ) => {
    const folderId = folder.getId();

    if (excludeFolderIds.has(folderId)) {
      console.log(`⏩ スキップ: ${path}`);
      return;
    }

    const outputValues: (string | number | boolean)[][] = [];
    const files = folder.getFiles();

    while (files.hasNext()) {
      const file = files.next();
      const fileId = file.getId();
      const mimeType = file.getMimeType();

      // Googleドキュメント、スプレッドシート、スライド、フォームなどが対象
      // (バイナリファイル等は Revisions API の挙動が異なる場合があるため)
      if (
        mimeType === MimeType.GOOGLE_DOCS ||
        mimeType === MimeType.GOOGLE_SHEETS ||
        mimeType === MimeType.GOOGLE_SLIDES ||
        mimeType === MimeType.GOOGLE_FORMS
      ) {
        if (isPublishedToWeb_(fileId)) {
          console.log(`✨ 公開中ファイル発見: ${file.getName()}`);
          outputValues.push([
            path,
            file.getName(),
            fileId,
            file.getUrl(),
            file.getLastUpdated().toLocaleString(),
          ]);
        }
      }
    }

    // このフォルダで見つかった公開ファイルを書き出し
    flushBatch(outputValues);

    // サブフォルダへ
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      const sub = subFolders.next();
      processFolder(sub, `${path}/${sub.getName()}`);
    }
  };

  console.log(`📂 探索開始: ${rootFolder.getName()}`);
  processFolder(rootFolder, rootFolder.getName());
  console.log(`🎉 探索完了。公開済みファイル合計: ${processedAllCount}件`);
}

function isPublishedToWeb_(fileId: string): boolean {
  // Drive API が有効であることを TypeScript に保証する
  if (typeof Drive === 'undefined') {
    throw new Error(
      'Drive API (Advanced Google Service) が有効になっていません。'
    );
  }

  try {
    // Drive.Revisions が undefined の可能性も考慮してオプショナルチェイニングを使用
    const revisions = Drive.Revisions?.list(fileId);

    if (!revisions) return false;

    // 型定義の不整合を回避しつつ items を取得
    const items = (revisions as any).items as
      | GoogleAppsScript.Drive.Schema.Revision[]
      | undefined;

    if (!items) return false;

    return items.some(revision => revision.published === true);
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('エラー: ' + e.message);
    }
    return false;
  }
}
