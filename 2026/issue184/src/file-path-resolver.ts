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
  FILE_PATH_DISPLAY_NAME_REPLACEMENT,
  FILE_PATH_DISPLAY_NAME_SEARCH,
  FILE_PATH_ERROR_VALUE,
} from './constants';

/**
 * 指定ファイルIDについて、親フォルダを遡ってルートからのパスを組み立てる。
 * 親フォルダが複数存在する場合は先頭の親を採用する。
 * 「/ドライブ/」は表示用に「/ARO内部のみ共有/」へ置き換える。
 * ファイルが見つからない、またはアクセス権がない場合はエラーを表す文字列を返す。
 */
export function getFilePath_(fileId: string): string {
  try {
    const file = DriveApp.getFileById(fileId);
    const folderNames: string[] = [];

    let parents = file.getParents();
    while (parents.hasNext()) {
      const folder = parents.next();
      folderNames.unshift(folder.getName());
      parents = folder.getParents();
    }

    const path = '/' + [...folderNames, file.getName()].join('/');
    return path.replace(
      FILE_PATH_DISPLAY_NAME_SEARCH,
      FILE_PATH_DISPLAY_NAME_REPLACEMENT,
    );
  } catch {
    return FILE_PATH_ERROR_VALUE;
  }
}
