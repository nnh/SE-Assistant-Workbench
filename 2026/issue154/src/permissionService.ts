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
import { getExcludeFolderIds_, getRootFolder_ } from './driveRepository';
import { getDataInformation_ } from './driveRepository';
import * as consts from './consts';
/**
 * 指定したルートフォルダ配下を再帰的に走査し、共有権限情報をスプレッドシートに書き出します。
 * バッチ処理による書き込みと「検索済み」シートによる重複防止機能を含みます。
 */
export function exportFolderPermissionsRecursive_() {
  let processedAllCount = 0;
  const rootFolder = getRootFolder_();

  // 対象外フォルダIDを取得
  const excludeFolderIds = getExcludeFolderIds_();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultSheet =
    ss.getSheetByName(consts.SHEET_NAME.PERMISSION) ||
    ss.insertSheet(consts.SHEET_NAME.PERMISSION);
  const doneSheet =
    ss.getSheetByName(consts.SHEET_NAME.DONE) ||
    ss.insertSheet(consts.SHEET_NAME.DONE);
  doneSheet.getRange(1, 1, 1, 2).setValues([['ID', 'パス']]);
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
      'ショートカット元フォルダID',
    ],
  ];
  resultSheet.getRange(1, 1, 1, header[0].length).setValues(header);
  /**
   * 処理結果のバッチ書き出しを実行し、カウンタを更新します。
   * @param {(string | number | boolean)[][]} outputValues - 書き出しデータの2次元配列
   * @param {number} processedCount - このバッチで処理したアイテム数
   */
  const flushBatch = (
    outputValues: (string | number | boolean)[][],
    processedCount: number
  ) => {
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
      SpreadsheetApp.flush();
    }
  };
  /**
   * フォルダを再帰的に走査し、ファイルとサブフォルダの情報を処理します。
   * @param {GoogleAppsScript.Drive.Folder} folder - 現在走査中のフォルダ
   * @param {string} path - ルートからのフォルダパス
   */
  const processFolder = (
    folder: GoogleAppsScript.Drive.Folder,
    path: string
  ) => {
    const folderId = folder.getId();

    // 除外対象フォルダであれば、このフォルダ自体とその配下の走査をスキップ
    if (excludeFolderIds.has(folderId)) {
      console.log(
        `⏩ 除外対象フォルダのためスキップ: ${path} (ID: ${folderId})`
      );
      return;
    }

    const outputValues = [];
    let processedCount = 0;

    if (!processedIds.has(folderId)) {
      outputValues.push(['フォルダ', path, ...getDataInformation_(folder)]);
      processedIds.add(folderId);
      processedCount++;
      console.log(`対象フォルダ: ${path}`);
    } else {
      processedIds.delete(folderId);
    }
    const doneFileData = [];
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const fileId = file.getId();
      if (!processedIds.has(fileId)) {
        outputValues.push(['ファイル', path, ...getDataInformation_(file)]);
        doneFileData.push([fileId, path]);
        processedIds.add(fileId);
        processedCount++;
      } else {
        processedIds.delete(fileId);
      }
    }
    flushBatch(outputValues, processedCount);
    const doneData = [[folderId, path], ...doneFileData];
    if (doneData.length > 0) {
      doneSheet
        .getRange(
          doneSheet.getLastRow() + 1,
          1,
          doneData.length,
          doneData[0].length
        )
        .setValues(doneData);
    }
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      const sub = subFolders.next();
      processFolder(sub, `${path}/${sub.getName()}`);
    }
  };
  console.log(`📂 探索開始: ${rootFolder.getName()}`);
  processFolder(rootFolder, rootFolder.getName());
  console.log(`🎉 全処理完了。合計: ${processedAllCount}件`);
  // 最後に2行目のパスを TARGET_PATH として保存
  const targetPath = resultSheet.getRange(2, 2).getValue();
  PropertiesService.getScriptProperties().setProperty(
    consts.PROP_KEY.TARGET_PATH,
    targetPath
  );
}
