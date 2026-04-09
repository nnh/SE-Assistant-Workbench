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
 * 指定したシートのデータをもとにフォルダを作成し、対象フォルダをそこへ移動させます。
 * 最終的に「移動先フォルダID」をL列に出力します。
 */
export function createAndMoveFolders_(
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

  // 1. 全データを取得（B列: パス, D列: 移動元ID）
  // 後の map で index を使うため全範囲を取得するのが安全です
  const values: string[][] = inputSheet
    .getRange(2, 1, lastRow - 1, inputSheet.getLastColumn())
    .getValues();

  // 同一パスの再利用のためのキャッシュ
  const pathCache: { [key: string]: string } = {};

  const idResults: string[][] = values.map(row => {
    const type = row[0].toString(); // A列: タイプ
    const originalPath = row[1].toString(); // B列: パス
    const targetFolderId = row[3].toString(); // D列: 移動元フォルダID

    // そもそも「フォルダ」行でない、またはパスがない場合はスキップ
    if (type !== 'フォルダ' || !originalPath) return [''];

    let destFolderId = '';

    // --- フォルダ特定/作成フェーズ ---
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
        // フォルダ作成（または確認）の実行
        destFolderId = createDeepFolderStructure_(folderNames, rootFolderId);
      }
    }

    // キャッシュを更新
    pathCache[originalPath] = destFolderId;

    // --- 移動実行フェーズ ---
    if (targetFolderId && destFolderId && targetFolderId !== destFolderId) {
      try {
        const fromFolder = DriveApp.getFolderById(targetFolderId);
        const toFolder = DriveApp.getFolderById(destFolderId);

        console.log(
          `移動中: [${fromFolder.getName()}] -> [${toFolder.getName()}]`
        );
        fromFolder.moveTo(toFolder);
      } catch (e) {
        console.error(
          `フォルダの移動に失敗しました (ID: ${targetFolderId}): ${e}`
        );
        return [`Error: 移動失敗`];
      }
    }

    return [destFolderId];
  });

  // 2. L列（12列目）にヘッダーと移動先IDを一括出力
  inputSheet.getRange(1, 12).setValue('移動先フォルダID');

  if (idResults.length > 0) {
    inputSheet.getRange(2, 12, inputSheet.getMaxRows() - 1, 1).clearContent();
    inputSheet.getRange(2, 12, idResults.length, 1).setValues(idResults);
    console.log('移動およびL列へのID出力が完了しました。');
  }
}
