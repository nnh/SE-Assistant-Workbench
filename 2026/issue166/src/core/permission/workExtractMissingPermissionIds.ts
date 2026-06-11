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

/**
 * 【作業用】
 * 権限一覧シートのA列に存在しないIDを ARO外部共有_フォルダ構成シートのA列から抽出し、
 * 作業用_権限出力対象IDリストシートに出力します。
 *
 * 削除方法: このファイルと index.ts の import・関数呼び出しを削除してください。
 */

import * as Const from '../../common/const';

export const workExtractMissingPermissionIds_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // ARO外部共有_フォルダ構成シートからIDを取得（2行目以降、1行目は見出し）
  const folderSheetName = `${Const.SHARED_DRIVE_NAME.EXTERNAL}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
  const folderSheet = ss.getSheetByName(folderSheetName);
  if (!folderSheet) {
    throw new Error(`シート「${folderSheetName}」が見つかりません。`);
  }
  const folderLastRow = folderSheet.getLastRow();
  if (folderLastRow < 2) {
    throw new Error(`シート「${folderSheetName}」にデータがありません。`);
  }
  const folderIds: string[] = folderSheet
    .getRange('A2:A' + folderLastRow)
    .getValues()
    .flat()
    .filter(
      (id: unknown): id is string => typeof id === 'string' && id.trim() !== ''
    )
    .map((id: string) => id.trim());

  // 権限一覧シートの既存IDをSetで保持（2行目以降、1行目は見出し）
  const permissionSheet = ss.getSheetByName(Const.SHEET_NAME.PERMISSION);
  const existingIds = new Set<string>();
  if (permissionSheet) {
    const permLastRow = permissionSheet.getLastRow();
    if (permLastRow >= 2) {
      permissionSheet
        .getRange('A2:A' + permLastRow)
        .getValues()
        .flat()
        .filter(
          (id: unknown): id is string =>
            typeof id === 'string' && id.trim() !== ''
        )
        .forEach((id: string) => existingIds.add(id.trim()));
    }
  }

  // 権限一覧に存在しないIDを抽出する（最大1000件）
  const missingIds = folderIds
    .filter(id => !existingIds.has(id))
    .slice(0, 1000);
  if (missingIds.length === 0) {
    console.log('権限一覧に存在しないIDはありませんでした。');
    return;
  }

  // 作業用_権限出力対象IDリストシートに出力する（1行目からデータを書き込む）
  let targetSheet = ss.getSheetByName(
    Const.SHEET_NAME.PERMISSION_TARGET_ID_LIST
  );
  if (!targetSheet) {
    targetSheet = ss.insertSheet(Const.SHEET_NAME.PERMISSION_TARGET_ID_LIST);
  } else {
    targetSheet.clearContents();
  }
  targetSheet
    .getRange(1, 1, missingIds.length, 1)
    .setValues(missingIds.map(id => [id]));

  console.log(
    `${missingIds.length} 件のIDを「${Const.SHEET_NAME.PERMISSION_TARGET_ID_LIST}」に出力しました。`
  );
};
