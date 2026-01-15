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
declare const Chat: any;

/**
 * Chat の Space 一覧を取得し、
 * スクリプトプロパティで指定されたフォルダに JSON 出力する
 */
function getFolder_(script_key: string) {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty(script_key);

  if (!folderId) {
    throw new Error(`Script property ${script_key} is not set.`);
  }

  const folder = DriveApp.getFolderById(folderId);
  return folder;
}
export function getChatList_() {
  const folder = getFolder_('CHAT_EXPORT_FOLDER_ID');
  // Chat API request settings
  const filter = 'space_type = "SPACE"';
  let responsePage;
  let pageToken: string | null = null;

  // 全 space を格納
  const allSpaces: any[] = [];

  do {
    responsePage = Chat.Spaces.list({
      filter: filter,
      pageSize: 100,
      pageToken: pageToken,
    });

    if (responsePage.spaces) {
      allSpaces.push(...responsePage.spaces);
    }

    pageToken = responsePage.nextPageToken;
  } while (pageToken);

  // JSON 文字列化（可読性のため整形）
  const json = JSON.stringify(allSpaces, null, 2);

  // ファイル名（実行時刻付き）
  const fileName = `chat_spaces_${Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyyMMdd_HHmmss'
  )}.json`;

  // 指定フォルダに作成
  const file = folder.createFile(fileName, json, MimeType.PLAIN_TEXT);

  console.log('getChatList_ completed');
  console.log(`Created file: ${file.getUrl()}`);
}

export function editChatList_() {
  const outputSpreadSheetId =
    PropertiesService.getScriptProperties().getProperty(
      'OUTPUT_SPREADSHEET_ID'
    );
  if (!outputSpreadSheetId) {
    throw new Error('Script property OUTPUT_SPREADSHEET_ID is not set.');
  }
  const ss = SpreadsheetApp.openById(outputSpreadSheetId);
  const sheetName = 'Spaces';
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clear();
  }
  const jsonFolder = getFolder_('CHAT_EXPORT_FOLDER_ID');
  const files = jsonFolder.getFilesByType(MimeType.PLAIN_TEXT);
  let latestFile = null;
  let latestDate = 0;
  while (files.hasNext()) {
    const file = files.next();
    const created = file.getDateCreated().getTime();
    if (created > latestDate) {
      latestDate = created;
      latestFile = file;
    }
  }
  if (!latestFile) {
    throw new Error('No JSON files found in the folder.');
  }
  const jsonFile = latestFile;
  const jsonContent = jsonFile.getBlob().getDataAsString();
  const spaces = JSON.parse(jsonContent);
  if (!Array.isArray(spaces)) {
    throw new Error('Invalid JSON format: expected an array of spaces.');
  }
  // オブジェクトを配列に変換
  const spacesArray = spaces.map(
    (space: object) => new Map(Object.entries(space))
  );

  const keys = new Set(
    spacesArray.flatMap((spaceMap: Map<string, any>) =>
      Array.from(spaceMap.keys())
    )
  );
  const outputBodies = spacesArray.map((spaceMap: Map<string, any>) => {
    const row: any[] = [];
    keys.forEach(key => {
      row.push(spaceMap.get(key) ?? '');
    });
    return row;
  });
  const headers = Array.from(keys);
  const outputValues = [headers, ...outputBodies];

  sheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}
