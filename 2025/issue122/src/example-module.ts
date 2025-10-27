/**
 * Copyright 2023 Google LLC
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
import { getDataInformation_ } from './getData';
const getRootFolder_ = () => {
  const folderId =
    PropertiesService.getScriptProperties().getProperty('TARGET_FOLDER_ID');
  if (!folderId) {
    throw new Error('TARGET_FOLDER_ID is not set in Script Properties.');
  }
  return DriveApp.getFolderById(folderId);
};
/**
 * 指定フォルダ配下すべてのフォルダ・ファイルの共有権限をスプレッドシートに出力
 * - 再帰的に全サブフォルダを探索
 * - 一定件数ごとにバッチ書き出し
 * - コンソールログに進捗出力
 * - 検索済みシートで途中再開可能
 */
export function exportFolderPermissionsRecursive_() {
  let processedAllCount = 0;
  const rootFolder = getRootFolder_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultSheet =
    ss.getSheetByName('共有権限') || ss.insertSheet('共有権限');
  const doneSheet = ss.getSheetByName('検索済み') || ss.insertSheet('検索済み');
  doneSheet.getRange(1, 1, 1, 2).setValues([['ID', 'パス']]);

  // 既に処理済みのIDを取得してSet化
  const processedIds = new Set(
    doneSheet.getRange('A2:A').getValues().flat().filter(String)
  );
  const header = [
    [
      'タイプ',
      'パス',
      '名前',
      'ID',
      'URL',
      'アクセス種別',
      '権限',
      'オーナー',
      '編集者',
      '閲覧者',
    ],
  ];
  // ヘッダー設定
  resultSheet.getRange(1, 1, 1, header[0].length).setValues(header);

  const flushBatch = (outputValues: string[][], processedCount: number) => {
    if (outputValues.length > 0) {
      resultSheet
        .getRange(
          resultSheet.getLastRow() + 1,
          1,
          outputValues.length,
          outputValues[0].length
        )
        .setValues(outputValues);
      console.log(
        `✅ ${processedCount}件処理完了（${outputValues.length}件をバッチ書き出し）`
      );
      processedAllCount += processedCount;
      //      outputValues.length = 0;
      SpreadsheetApp.flush();
    }
  };

  /**
   * 再帰処理本体
   */
  const processFolder = (
    folder: GoogleAppsScript.Drive.Folder,
    path: string
  ) => {
    const outputValues: string[][] = [];
    let processedCount = 0;
    const folderId = folder.getId();
    /*if (processedIds.has(folderId)) {
      console.log(`⏭️ スキップ: ${path}`);
      return;
    }*/

    // フォルダ情報を追加
    outputValues.push(['フォルダ', path, ...getDataInformation_(folder)]);
    doneSheet.appendRow([folderId, path]);
    processedIds.add(folderId);
    processedCount++;
    //    if (processedCount % BATCH_SIZE === 0) flushBatch();

    // ファイル処理
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const fileId = file.getId();
      //if (processedIds.has(fileId)) continue;
      outputValues.push(['ファイル', path, ...getDataInformation_(file)]);
      doneSheet.appendRow([fileId, path]);
      processedIds.add(fileId);
      processedCount++;
      //      if (processedCount % BATCH_SIZE === 0) flushBatch();
    }
    flushBatch(outputValues, processedCount);

    // サブフォルダ処理（再帰）
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      const sub = subFolders.next();
      processFolder(sub, `${path}/${sub.getName()}`);
    }
  };

  console.log(`📂 探索開始: ${rootFolder.getName()}`);
  processFolder(rootFolder, rootFolder.getName());
  console.log(`🎉 全処理完了。合計: ${processedAllCount}件`);
}
