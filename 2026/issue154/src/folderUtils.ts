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
import * as consts from './consts';
export function moveToFolder_(
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  const values = inputSheet.getDataRange().getValues() as string[][];
  // A列が「フォルダ」の行をフィルタリング
  const folderRows = values.filter(row => row[0] === 'フォルダ');
  //D列が移動元、M列が移動先
  const fromFolderIdAndToFolderIdList = folderRows.map(row => [
    row[3],
    row[12],
  ]);
  console.log(
    '移動元と移動先のフォルダIDのペア: ',
    fromFolderIdAndToFolderIdList
  );

  fromFolderIdAndToFolderIdList.forEach(([fromFolderId, toFolderId]) => {
    if (!fromFolderId || !toFolderId) {
      console.warn(
        `移動元または移動先のフォルダIDが空です。fromFolderId: "${fromFolderId}", toFolderId: "${toFolderId}"`
      );
      return;
    }
    const fromFolder = DriveApp.getFolderById(fromFolderId);
    console.log(fromFolder.getName());
    const toFolder = DriveApp.getFolderById(toFolderId);
    console.log(toFolder.getName());
    fromFolder.moveTo(toFolder);
  });
}
/**
 * 指定したシートのデータをもとにフォルダを作成し、最終フォルダのIDをL列に出力します。
 * @param inputSheet
 */
export function createFolders_(
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  const lastRow = inputSheet.getLastRow();
  if (lastRow < 2) return;

  // 0. 基点となるフォルダIDを先に取得しておく
  const rootFolderId = PropertiesService.getScriptProperties().getProperty(
    consts.PROP_KEY.DESTINATION_ROOT_FOLDER_ID
  );
  if (!rootFolderId) {
    throw new Error(
      `スクリプトプロパティ "${consts.PROP_KEY.DESTINATION_ROOT_FOLDER_ID}" が設定されていません。`
    );
  }

  // 1. B列（2行目以降）からパスを取得
  const bValues: string[][] = inputSheet
    .getRange(2, 2, lastRow - 1, 1)
    .getValues();

  const idResults: string[][] = bValues.map(row => {
    let pathString = row[0].toString();
    if (!pathString) return [''];
    // A. 「ドライブ」と完全一致する場合
    if (pathString === 'ドライブ') {
      pathString = ''; // ルートフォルダを指すので空の文字列
    }

    // B. 最初が「ドライブ/」だったらその部分を空白に置換
    if (pathString.startsWith('ドライブ/')) {
      pathString = pathString.replace(/^ドライブ\//, '');
    }

    // パスを分割してフォルダ階層を作成
    const folderNames = pathString.split('/').filter(part => part !== '');
    if (folderNames.length === 0) return [rootFolderId]; // 置換の結果空になった場合

    //const folderId = createDeepFolderStructure_(folderNames, rootFolderId);
    //return [folderId];
    // for test
    return [folderNames.join(' / ')];
  });

  // 2. L列（12列目）にヘッダーとIDを一括出力
  const headerRange = inputSheet.getRange(1, 12);
  headerRange.setValue('移動先フォルダID'); // ヘッダー

  if (idResults.length > 0) {
    // 既存データをクリア（2行目以降）
    inputSheet.getRange(2, 12, inputSheet.getMaxRows() - 1, 1).clearContent();
    // 新しいIDを書き込み
    inputSheet.getRange(2, 12, idResults.length, 1).setValues(idResults);
    console.log('L列へのフォルダID出力が完了しました。');
  }
}

/**
 * 階層フォルダを作成/確認し、最終フォルダのIDを返す
 * @param folderNames フォルダ名の配列
 * @param rootFolderId 基点フォルダID
 */
/*
function createDeepFolderStructure_(
  folderNames: string[],
  rootFolderId: string
): string {
  try {
    let parentFolder = DriveApp.getFolderById(rootFolderId);

    for (const folderName of folderNames) {
      const subFolders = parentFolder.getFoldersByName(folderName);
      if (subFolders.hasNext()) {
        parentFolder = subFolders.next();
      } else {
        parentFolder = parentFolder.createFolder(folderName);
      }
    }
    return parentFolder.getId();
  } catch (e) {
    const errorMessage = e instanceof Error ? e.message : String(e);
    console.error('フォルダ作成エラー:', errorMessage);
    return 'Error: ' + errorMessage;
  }
}
*/
