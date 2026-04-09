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
import { createDeepFolderStructure_ } from './driveRepository';

/**
 * 指定したシートのデータをもとに（必要であれば）フォルダを作成し、対象ファイルをそこへ移動させます。
 * 最終的に、ファイルが移動した先のフォルダIDをL列に出力します。
 */
export function createAndMoveFiles_(
  inputSheet: GoogleAppsScript.Spreadsheet.Sheet
): void {
  const lastRow = inputSheet.getLastRow();
  if (lastRow < 2) return;

  // 0. 基点となるフォルダIDを取得
  const rootFolderId = PropertiesService.getScriptProperties().getProperty(
    consts.PROP_KEY.DESTINATION_ROOT_FOLDER_ID
  );
  if (!rootFolderId) {
    throw new Error(
      `スクリプトプロパティ "${consts.PROP_KEY.DESTINATION_ROOT_FOLDER_ID}" が設定されていません。`
    );
  }

  // 1. 全データを取得（A列: タイプ, B列: パス, D列: 移動元ファイルID）
  const values: string[][] = inputSheet
    .getRange(2, 1, lastRow - 1, inputSheet.getLastColumn())
    .getValues();

  // 同一パスの再利用のためのキャッシュ（フォルダ作成を最小限にする）
  const pathCache: { [key: string]: string } = {};

  const idResults: string[][] = values.map(row => {
    const type = row[0].toString(); // A列: タイプ
    const originalPath = row[1].toString(); // B列: パス
    const targetFileId = row[3].toString(); // D列: 移動元ファイルID

    // 「ファイル」行でない、またはパスがない場合はスキップ
    if (type !== 'ファイル' || !originalPath) return [''];

    let destFolderId = '';

    // --- 格納先フォルダ特定/作成フェーズ ---
    if (pathCache[originalPath]) {
      destFolderId = pathCache[originalPath];
    } else if (originalPath === 'ドライブ') {
      destFolderId = rootFolderId;
    } else {
      let pathString = originalPath;
      if (pathString.startsWith('ドライブ/')) {
        pathString = pathString.replace(/^ドライブ\//, '');
      }

      const folderNames = pathString.split('/').filter(part => part !== '');

      if (folderNames.length === 0) {
        destFolderId = rootFolderId;
      } else {
        // ファイルを保存すべき階層のフォルダを作成/特定
        destFolderId = createDeepFolderStructure_(folderNames, rootFolderId);
      }
    }

    // キャッシュを更新
    pathCache[originalPath] = destFolderId;

    // --- ファイル移動実行フェーズ ---
    if (targetFileId && destFolderId) {
      try {
        const file = DriveApp.getFileById(targetFileId);
        const toFolder = DriveApp.getFolderById(destFolderId);

        // ファイルが既にそのフォルダに存在するかチェック（移動不要ならスキップ可能）
        // ここでは強制的に moveTo を実行
        console.log(
          `ファイル移動中: [${file.getName()}] -> フォルダID: [${destFolderId}]`
        );
        file.moveTo(toFolder);
      } catch (e) {
        console.error(
          `ファイルの移動に失敗しました (ID: ${targetFileId}): ${e}`
        );
        return [`Error: 移動失敗`];
      }
    }

    return [destFolderId];
  });

  // 2. L列（12列目）にヘッダーと格納先フォルダIDを一括出力
  inputSheet.getRange(1, 12).setValue('移動先フォルダID');

  if (idResults.length > 0) {
    // 既存データをクリア（2行目以降）し、新しいIDを書き込み
    inputSheet.getRange(2, 12, inputSheet.getMaxRows() - 1, 1).clearContent();
    inputSheet.getRange(2, 12, idResults.length, 1).setValues(idResults);
    console.log('ファイルの移動およびL列へのID出力が完了しました。');
  }
}
