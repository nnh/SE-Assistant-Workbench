/**
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { getRootFolder_, getSearchExcludeFolderIds_ } from './driveRepository';
import * as consts from './consts';

export function exportPublishedFilesRecursive_() {
  const startTime = Date.now();
  const MAX_EXECUTION_TIME = 25 * 60 * 1000; // 25分

  let processedAllCount = 0;
  const rootFolder = getRootFolder_();
  const rootFolderName = rootFolder.getName();
  const excludeFolderIds = getSearchExcludeFolderIds_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 日時を読みやすい形式に整形
  const now = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmm');

  // Spreadsheet ID を使って DriveApp からファイルとして取得
  const ssFile = DriveApp.getFileById(ss.getId());

  // ファイル名を設定
  ssFile.setName(`Web公開済みファイル一覧_${rootFolderName}_${now}`);

  const SHEET_NAME_PUBLISHED = consts.SHEET_NAME.PUBLISHED;
  const SHEET_NAME_DONE = consts.SHEET_NAME.DONE; // 完了記録用シート

  const resultSheet = ss.getSheetByName(SHEET_NAME_PUBLISHED);
  if (!resultSheet)
    throw new Error(`シート "${SHEET_NAME_PUBLISHED}" がありません。`);

  const doneSheet =
    ss.getSheetByName(SHEET_NAME_DONE) || ss.insertSheet(SHEET_NAME_DONE);

  // すでに処理が終わったフォルダIDをSetで取得（高速化）
  const processedFolderIds = new Set(
    doneSheet.getRange('A:A').getValues().flat().filter(String)
  );

  /**
   * 処理済みフォルダIDを保存
   */
  const markFolderAsDone = (folderId: string) => {
    doneSheet.appendRow([folderId, new Date().toLocaleString()]);
    processedFolderIds.add(folderId);
  };

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
   * フォルダを再帰的に走査（中断チェック付き）
   */
  const processFolder = (
    folder: GoogleAppsScript.Drive.Folder,
    path: string
  ): boolean => {
    console.log(`📂 Processing: ${path}`);
    // 1. 中断チェック
    if (Date.now() - startTime > MAX_EXECUTION_TIME) {
      console.warn(
        `⏳ タイムアウトが近いため、${path} で処理を一時中断します。`
      );
      return false; // 中断信号を返す
    }

    const folderId = folder.getId();

    // 2. スキップ判定（除外リストまたは処理済みリスト）
    if (excludeFolderIds.has(folderId) || processedFolderIds.has(folderId)) {
      return true; // このフォルダは完了（または不要）なので次へ
    }

    // 3. ファイル処理
    const outputValues: (string | number | boolean)[][] = [];
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const mimeType = file.getMimeType();

      if (
        mimeType === MimeType.GOOGLE_DOCS ||
        mimeType === MimeType.GOOGLE_SHEETS ||
        mimeType === MimeType.GOOGLE_SLIDES ||
        mimeType === MimeType.GOOGLE_FORMS
      ) {
        if (isPublishedToWeb_(file.getId())) {
          outputValues.push([
            path,
            file.getName(),
            file.getId(),
            file.getUrl(),
            file.getLastUpdated().toLocaleString(),
          ]);
        }
      }
    }
    flushBatch(outputValues);

    // 4. サブフォルダ処理
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      const sub = subFolders.next();
      // 再帰呼び出し。中断信号を受け取ったら即座にリレーして終了
      const isComplete = processFolder(sub, `${path}/${sub.getName()}`);
      if (!isComplete) return false;
    }

    // 5. このフォルダの全配下が終了したら「完了」として記録
    markFolderAsDone(folderId);
    return true;
  };

  console.log(`📂 探索開始: ${rootFolder.getName()}`);
  const isFinished = processFolder(rootFolder, rootFolder.getName());

  if (isFinished) {
    console.log(`🎉 全処理が完了しました！ 合計: ${processedAllCount}件`);
    // 完了したらDONEシートをクリアしても良い
  } else {
    console.log(`ℹ️ 中断されました。再度実行すると続きから開始します。`);
  }
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
