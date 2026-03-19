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
 * 【汎用関数】
 * 引数で指定されたプロパティキーからフォルダIDを取得し、指定シートへ出力する
 * * @param {string} propertyKey - スクリプトプロパティのキー名
 * @param {string} sheetName - 出力先のスプレッドシート名
 */
export function exportSubfolderNames_(propertyKey: string, sheetName: string) {
  // 1. 引数からフォルダIDを取得
  const props = PropertiesService.getScriptProperties();
  const targetFolderId = props.getProperty(propertyKey);

  if (!targetFolderId) {
    console.error(
      `プロパティ「${propertyKey}」が見つかりませんでした。設定を確認してください。`
    );
    return;
  }

  try {
    // 2. フォルダ配下の子フォルダを取得
    const parentFolder = DriveApp.getFolderById(targetFolderId);
    const subFolders = parentFolder.getFolders();

    const folderNames: string[][] = [];
    while (subFolders.hasNext()) {
      const folder = subFolders.next();
      folderNames.push([folder.getName()]);
    }

    // 3. 指定されたシート名への書き出し
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(sheetName);

    // シートが存在しない場合は新規作成
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    // 既存データをクリアして一括書き込み
    sheet.clearContents();
    if (folderNames.length > 0) {
      const header = [['name']];
      sheet.getRange(1, 1, 1, 1).setValues(header);
      sheet.getRange(2, 1, folderNames.length, 1).setValues(folderNames);
      console.log(
        `シート「${sheetName}」に ${folderNames.length} 件出力しました。`
      );
    } else {
      console.log(
        `「${parentFolder.getName()}」配下にフォルダは見つかりませんでした。`
      );
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error(`エラーが発生しました: ${e.message}`);
    } else {
      console.error('エラーが発生しました:', e);
    }
  }
}

/**
 * 共有ドライブ内のフォルダ一覧を取得する
 * @param {string} driveId 共有ドライブID
 * @return {Array<Object>} フォルダ情報一覧
 */
export function getFoldersInSharedDrive_(): string[][] {
  //const folders: Array<{ id: string; name: string; parents: string[] }> = [];
  //const pageToken: string | null = null;
  if (typeof Drive === 'undefined' || !Drive.Files) {
    console.error(
      'Drive APIが利用できません。Google Apps ScriptのプロジェクトでDrive APIを有効にしてください。'
    );
    return [];
  }
  const driveList: GoogleAppsScript.Drive_v3.Drive.V3.Schema.DriveList =
    Drive.Drives.list({
      pageSize: 100,
      fields: 'drives(id, name)',
    });
  const drives = driveList.drives ?? [];

  // ヘッダー + データ
  const values: string[][] = [
    ['Drive ID', 'Drive Name'],
    ...drives.map(d => [d.id ?? '', d.name ?? '']),
  ];

  return values;
}
