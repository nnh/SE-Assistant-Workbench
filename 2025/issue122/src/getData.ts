/**
 * Copyright 2023 Google LLC
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
import { safeGet_ } from './common';
/**
 * ファイルまたはフォルダの情報を配列で返す
 */
export function getDataInformation_(
  data: GoogleAppsScript.Drive.File | GoogleAppsScript.Drive.Folder
): string[] {
  const name = data.getName();
  const id = data.getId();
  const url = data.getUrl();
  const accessClass = safeGet_(() => String(data.getSharingAccess()));
  const perm = safeGet_(() => String(data.getSharingPermission()));
  const owner = safeGet_(() => data.getOwner()?.getEmail() ?? '');
  const editors = safeGet_(() =>
    data
      .getEditors()
      .map(e => e.getEmail())
      .join('\n')
  );
  const viewers = safeGet_(() =>
    data
      .getViewers()
      .map(v => v.getEmail())
      .join('\n')
  );
  const shortcutFolderId: string = safeGet_(() => {
    try {
      const getFileTry: GoogleAppsScript.Drive.File = DriveApp.getFileById(
        data.getId()
      );
    } catch (e) {
      return '';
    }
    const targetFile = DriveApp.getFileById(data.getId());
    const mimeType = targetFile.getMimeType();
    if (mimeType !== MimeType.SHORTCUT) {
      return '';
    }
    const targetId = targetFile.getTargetId();
    if (targetId === null || targetId === undefined) {
      return '';
    }
    return targetId;
  });
  return [
    name,
    id,
    url,
    accessClass,
    perm,
    owner,
    editors,
    viewers,
    shortcutFolderId,
  ];
}
