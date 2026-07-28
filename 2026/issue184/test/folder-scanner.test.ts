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
import {collectSpreadsheetsInFolder_} from '../src/folder-scanner';

function createIterator<T>(items: T[]) {
  let index = 0;
  return {
    hasNext: () => index < items.length,
    next: () => items[index++],
  };
}

function createFakeFile(name: string, id: string, url: string) {
  return {
    getName: () => name,
    getId: () => id,
    getUrl: () => url,
  };
}

describe('collectSpreadsheetsInFolder_', () => {
  it('サブフォルダを含めて全スプレッドシートを収集する', () => {
    const childFile = createFakeFile('child', 'child-id', 'child-url');
    const childFolder = {
      getFilesByType: () => createIterator([childFile]),
      getFolders: () => createIterator([]),
    };

    const rootFile = createFakeFile('root', 'root-id', 'root-url');
    const rootFolder = {
      getFilesByType: () => createIterator([rootFile]),
      getFolders: () => createIterator([childFolder]),
    };

    (global as unknown as {DriveApp: unknown}).DriveApp = {
      getFolderById: () => rootFolder,
    };
    (global as unknown as {MimeType: unknown}).MimeType = {
      GOOGLE_SHEETS: 'application/vnd.google-apps.spreadsheet',
    };

    const result = collectSpreadsheetsInFolder_('root-folder-id');

    expect(result).toEqual([
      {name: 'root', id: 'root-id', url: 'root-url'},
      {name: 'child', id: 'child-id', url: 'child-url'},
    ]);
  });
});
