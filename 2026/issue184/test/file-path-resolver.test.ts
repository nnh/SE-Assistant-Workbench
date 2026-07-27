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
import {getFilePath_} from '../src/file-path-resolver';

function createIterator<T>(items: T[]) {
  let index = 0;
  return {
    hasNext: () => index < items.length,
    next: () => items[index++],
  };
}

describe('getFilePath_', () => {
  it('親フォルダを遡ってルートからのパスを組み立てる', () => {
    const rootFolder = {
      getName: () => 'root',
      getParents: () => createIterator([]),
    };
    const childFolder = {
      getName: () => 'child',
      getParents: () => createIterator([rootFolder]),
    };
    const file = {
      getName: () => 'file.txt',
      getParents: () => createIterator([childFolder]),
    };

    (global as unknown as {DriveApp: unknown}).DriveApp = {
      getFileById: () => file,
    };

    expect(getFilePath_('file-id')).toBe('/root/child/file.txt');
  });

  it('ルートフォルダ名「ドライブ」を「ARO内部のみ共有」に置き換える', () => {
    const rootFolder = {
      getName: () => 'ドライブ',
      getParents: () => createIterator([]),
    };
    const file = {
      getName: () => 'file.txt',
      getParents: () => createIterator([rootFolder]),
    };

    (global as unknown as {DriveApp: unknown}).DriveApp = {
      getFileById: () => file,
    };

    expect(getFilePath_('file-id')).toBe('/ARO内部のみ共有/file.txt');
  });

  it('ファイルが見つからない場合はエラーを表す文字列を返す', () => {
    (global as unknown as {DriveApp: unknown}).DriveApp = {
      getFileById: () => {
        throw new Error('No item with the given ID could be found.');
      },
    };

    expect(getFilePath_('missing-file-id')).toBe('取得エラー');
  });
});
