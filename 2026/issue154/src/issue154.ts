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
/** 取得失敗時に表示する定数文字列 */
const cstNoGet = '!取得不可!';
/** 権限情報を出力するメインシート名 */
const cstMoveBeforeDataSheetName = '共有権限';

/**
 * 実行に失敗する可能性がある処理をラップし、エラー時はデフォルト値を返します。
 * @template T - 実行する関数の戻り値の型
 * @param {function(): T} fn - 実行する関数
 * @returns {T | string} 関数が成功した場合はその戻り値、失敗した場合は '!取得不可!'
 */
function safeGet_<T>(fn: () => T): T | string {
  try {
    return fn();
  } catch {
    // cstNoGet は '!取得不可!' という文字列なので、戻り値の型は T | string になります
    return cstNoGet;
  }
}

/**
 * フォルダまたはファイルから情報を抽出し、配列として返します。
 * @param {GoogleAppsScript.Drive.Folder | GoogleAppsScript.Drive.File} data - 取得対象のオブジェクト
 * @returns {(string | number | boolean)[]} 抽出された情報の配列（名前、ID、URL、アクセス権限、編集/閲覧者、ショートカット情報など）
 */
function getDataInformation_(
  data: GoogleAppsScript.Drive.Folder | GoogleAppsScript.Drive.File
): (string | number | boolean)[] {
  const name = data.getName();
  const id = data.getId();
  const url = data.getUrl();

  const accessClass = safeGet_(() => String(data.getSharingAccess()));
  const perm = safeGet_(() => String(data.getSharingPermission()));
  const owner = safeGet_(() => data.getOwner()?.getEmail() ?? '');

  const editors = safeGet_(() =>
    data
      .getEditors()
      .map((e: GoogleAppsScript.Base.User) => e.getEmail())
      .join('\n')
  );

  const viewers = safeGet_(() =>
    data
      .getViewers()
      .map((v: GoogleAppsScript.Base.User) => v.getEmail())
      .join('\n')
  );

  const shortcutFolderId = safeGet_(() => {
    try {
      const targetFile = DriveApp.getFileById(data.getId());
      const mimeType = targetFile.getMimeType();

      if (mimeType !== 'application/vnd.google-apps.shortcut') {
        return '';
      }

      return targetFile.getTargetId() ?? '';
    } catch {
      return '';
    }
  });

  return [
    name,
    id,
    url,
    accessClass,
    perm,
    owner,
    editors,
    viewers,
    shortcutFolderId,
  ];
}

/**
 * スクリプトプロパティからルートフォルダのIDを取得し、Folderオブジェクトを返します。
 * @returns {GoogleAppsScript.Drive.Folder} 指定されたルートフォルダ
 * @throws {Error} TARGET_FOLDER_ID が設定されていない場合
 */
const getRootFolder_ = () => {
  const folderId =
    PropertiesService.getScriptProperties().getProperty('TARGET_FOLDER_ID');
  if (!folderId) {
    throw new Error('TARGET_FOLDER_ID is not set in Script Properties.');
  }
  return DriveApp.getFolderById(folderId);
};

/**
 * 指定したルートフォルダ配下を再帰的に走査し、共有権限情報をスプレッドシートに書き出します。
 * バッチ処理による書き込みと「検索済み」シートによる重複防止機能を含みます。
 */
export function exportFolderPermissionsRecursive_() {
  let processedAllCount = 0;
  const rootFolder = getRootFolder_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultSheet =
    ss.getSheetByName(cstMoveBeforeDataSheetName) ||
    ss.insertSheet(cstMoveBeforeDataSheetName);
  const doneSheet = ss.getSheetByName('検索済み') || ss.insertSheet('検索済み');
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
    const outputValues = [];
    let processedCount = 0;
    const folderId = folder.getId();
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
    'TARGET_PATH',
    targetPath
  );
}

/**
 * フォルダ移行等に必要な環境設定（スクリプトプロパティ）を一括設定します。
 * @param {string} targetFolderId - 対象となるルートフォルダのID
 */
function setScriptProperties_(targetFolderId: string) {
  PropertiesService.getScriptProperties().setProperty(
    'TARGET_FOLDER_ID',
    targetFolderId
  );
}

/**
 * スクリプトプロパティ 'TARGET_ROOT_FOLDER_ID' を基に設定処理を実行します。
 * @throws {Error} TARGET_ROOT_FOLDER_ID が未設定の場合
 */
export function execSetProperties_() {
  const targetFolderId = PropertiesService.getScriptProperties().getProperty(
    'TARGET_ROOT_FOLDER_ID'
  );
  if (!targetFolderId) {
    throw new Error('TARGET_ROOT_FOLDER_ID is not set in Script Properties.');
  }
  if (targetFolderId === 'FOLDER_ID_HERE') {
    throw new Error('Please set the actual folder ID in the code.');
  }
  setScriptProperties_(targetFolderId);
}
