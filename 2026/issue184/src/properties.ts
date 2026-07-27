/**
 * Copyright 2026 Google LLC
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
import {
  PROPERTY_KEY_ARO_SPREADSHEET_ID,
  PROPERTY_KEY_FOLDER_ID,
} from './constants';

/**
 * スクリプトプロパティが未設定の場合のみダミー値を設定する。
 * 既に値が設定されている場合は上書きしない。
 */
export function initializeProperties_(): void {
  const properties = PropertiesService.getScriptProperties();
  if (properties.getProperty(PROPERTY_KEY_FOLDER_ID) === null) {
    properties.setProperty(PROPERTY_KEY_FOLDER_ID, 'YOUR_FOLDER_ID_HERE');
  }
  if (properties.getProperty(PROPERTY_KEY_ARO_SPREADSHEET_ID) === null) {
    properties.setProperty(
      PROPERTY_KEY_ARO_SPREADSHEET_ID,
      'YOUR_SPREADSHEET_ID_HERE',
    );
  }
}

/**
 * 検索対象フォルダIDをスクリプトプロパティから取得する。
 */
export function getFolderId_(): string {
  const folderId = PropertiesService.getScriptProperties().getProperty(
    PROPERTY_KEY_FOLDER_ID,
  );
  if (!folderId) {
    throw new Error(
      `スクリプトプロパティ「${PROPERTY_KEY_FOLDER_ID}」が設定されていません。`,
    );
  }
  return folderId;
}

/**
 * ARO外部共有ファイル一覧スプレッドシートIDをスクリプトプロパティから取得する。
 */
export function getAroSpreadsheetId_(): string {
  const spreadsheetId = PropertiesService.getScriptProperties().getProperty(
    PROPERTY_KEY_ARO_SPREADSHEET_ID,
  );
  if (!spreadsheetId) {
    throw new Error(
      `スクリプトプロパティ「${PROPERTY_KEY_ARO_SPREADSHEET_ID}」が設定されていません。`,
    );
  }
  return spreadsheetId;
}
