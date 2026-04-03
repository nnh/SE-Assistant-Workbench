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
export function moveFileToFolder_(
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  const values = inputSheet.getDataRange().getValues() as string[][];
  // A列が「ファイル」の行をフィルタリング
  const fileRows = values.filter(row => row[0] === 'ファイル');
  //D列が移動するファイル、M列が移動先フォルダのID
  const fromFileIdAndToFolderIdList = fileRows.map(row => [row[3], row[12]]);
  console.log(
    '移動元と移動先のフォルダIDのペア: ',
    fromFileIdAndToFolderIdList
  );

  fromFileIdAndToFolderIdList.forEach(([fromFileId, toFolderId]) => {
    if (!fromFileId || !toFolderId) {
      console.warn(
        `移動元ファイルまたは移動先のフォルダIDが空です。fromFileId: "${fromFileId}", toFolderId: "${toFolderId}"`
      );
      return;
    }
    tryMoveFile_(fromFileId, toFolderId);
  });
}

/**
 * 指定したファイルを指定したフォルダへ移動試行する関数
 * @param {string} fileId - 移動したいファイルのID
 * @param {string} folderId - 移動先フォルダのID
 */
function tryMoveFile_(fileId: string, folderId: string): void {
  try {
    const file = DriveApp.getFileById(fileId);
    const targetFolder = DriveApp.getFolderById(folderId);

    // .moveTo() を試行
    file.moveTo(targetFolder);

    console.log('移動成功: ' + file.getName());
    console.log('URL: ' + file.getUrl());
  } catch (e) {
    let errorMessage = '不明なエラーが発生しました';

    if (e instanceof Error) {
      errorMessage = e.message;
    } else if (typeof e === 'string') {
      errorMessage = e;
    }

    console.error('エラーが発生しました: ' + errorMessage);
  }
}
