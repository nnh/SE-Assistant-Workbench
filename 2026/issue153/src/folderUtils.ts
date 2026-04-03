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
export function createFolders_(
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  // 1. B列（2行目以降）からパスを取得し、置換・分割済みの配列を作成
  const lastRow = inputSheet.getLastRow();
  if (lastRow < 2) return;

  const bValues: string[][] = inputSheet
    .getRange(2, 2, lastRow - 1, 1)
    .getValues();
  const folderNamesList = bValues.map(row => {
    const pathString = row[0].toString();
    if (!pathString) return null;

    const parts = pathString.split('/');
    return parts;
  });

  // 2. 各パスに対してフォルダ作成を実行し、URLを取得
  const urlResults: string[][] = [];
  folderNamesList.forEach(folderNames => {
    if (folderNames) {
      const url = createDeepFolderStructure_(folderNames);
      urlResults.push([url]); // setValues用に二次元配列の形式にする
    } else {
      urlResults.push(['']); // 空白行の場合は空文字
    }
  });

  // 3. M列（13列目）の2行目以降にURLを一括出力
  if (urlResults.length > 0) {
    inputSheet.getRange(2, 13, urlResults.length, 1).setValues(urlResults);
    console.log('M列へのURL出力が完了しました。');
  }
}

/**
 * 階層フォルダを作成/確認し、最終フォルダのURLを返す
 * @param {string[]} folderNames フォルダ名の配列
 * @return {string} 最終フォルダのID（エラー時は空文字）
 */
function createDeepFolderStructure_(folderNames: string[]): string {
  // 基点となるフォルダID
  const rootFolderId =
    PropertiesService.getScriptProperties().getProperty('ROOT_FOLDER_ID');
  if (!rootFolderId) {
    throw new Error(
      'スクリプトプロパティ "ROOT_FOLDER_ID" が設定されていません。'
    );
  }
  if (!folderNames || folderNames.length === 0) {
    throw new Error('フォルダ名の配列が空です。');
  }
  if (!DriveApp.getFolderById(rootFolderId)) {
    throw new Error(
      `ROOT_FOLDER_ID "${rootFolderId}" に対応するフォルダが見つかりません。`
    );
  }

  try {
    let parentFolder = DriveApp.getFolderById(rootFolderId);

    for (let i = 0; i < folderNames.length; i++) {
      const folderName = folderNames[i];
      const subFolders = parentFolder.getFoldersByName(folderName);

      if (subFolders.hasNext()) {
        parentFolder = subFolders.next();
      } else {
        parentFolder = parentFolder.createFolder(folderName);
      }
    }

    // 最終的なフォルダのURLを返却
    return parentFolder.getId();
  } catch (e) {
    let errorMessage = '不明なエラーが発生しました';

    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }

    console.error('エラーが発生しました: ' + errorMessage);
    return 'Error: ' + errorMessage;
  }
}
