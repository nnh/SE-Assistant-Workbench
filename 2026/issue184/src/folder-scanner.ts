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
export interface SpreadsheetInfo {
  name: string;
  id: string;
  url: string;
}

/**
 * 指定フォルダ配下（サブフォルダ含む）の全スプレッドシート情報を取得する。
 */
export function collectSpreadsheetsInFolder_(
  folderId: string,
): SpreadsheetInfo[] {
  const rootFolder = DriveApp.getFolderById(folderId);
  return collectSpreadsheetsRecursively_(rootFolder);
}

function collectSpreadsheetsRecursively_(
  folder: GoogleAppsScript.Drive.Folder,
): SpreadsheetInfo[] {
  const results: SpreadsheetInfo[] = [];

  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);
  while (files.hasNext()) {
    const file = files.next();
    results.push({
      name: file.getName(),
      id: file.getId(),
      url: file.getUrl(),
    });
  }

  const subFolders = folder.getFolders();
  while (subFolders.hasNext()) {
    results.push(...collectSpreadsheetsRecursively_(subFolders.next()));
  }

  return results;
}
