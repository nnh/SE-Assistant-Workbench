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

import { safeGet_ } from './utils';
import * as consts from './consts';
/**
 * スクリプトプロパティからルートフォルダのIDを取得し、Folderオブジェクトを返します。
 * @returns {GoogleAppsScript.Drive.Folder} 指定されたルートフォルダ
 * @throws {Error} TARGET_FOLDER_ID が設定されていない場合
 */
export const getRootFolder_ = () => {
  const folderId = PropertiesService.getScriptProperties().getProperty(
    consts.PROP_KEY.TARGET_FOLDER_ID
  );
  if (!folderId) {
    throw new Error(
      `${consts.PROP_KEY.TARGET_FOLDER_ID} is not set in Script Properties.`
    );
  }
  return DriveApp.getFolderById(folderId);
};

/**
 * 「検索対象外フォルダ」シートから、再帰走査の対象から除外したいフォルダIDの一覧を取得します。
 * この一覧に含まれるフォルダは、その中身（ファイル・サブフォルダ）を含めて一切処理されません。
 * @returns {Set<string>} 検索対象外フォルダIDのセット
 */
export const getSearchExcludeFolderIds_ = (): Set<string> => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(consts.SHEET_NAME.SEARCH_EXCLUDE);

  // シートが存在しない場合は除外設定なしとして空のSetを返す
  if (!sheet) return new Set();

  const lastRow = sheet.getLastRow();
  // ヘッダーのみ、または空の場合は空のSetを返す
  if (lastRow < 2) return new Set();

  // A列の2行目から最終行までIDを取得
  const ids: string[] = sheet
    .getRange(2, 1, lastRow - 1, 1)
    .getValues()
    .flat();

  // 空文字を除去し、重複を排除したSetを返す
  return new Set(ids.filter(id => id && typeof id === 'string'));
};
/**
 * フォルダまたはファイルから情報を抽出し、配列として返します。
 * @param {GoogleAppsScript.Drive.Folder | GoogleAppsScript.Drive.File} data - 取得対象のオブジェクト
 * @returns {(string | number | boolean)[]} 抽出された情報の配列（名前、ID、URL、アクセス権限、編集/閲覧者、ショートカット情報など）
 */
export const getDataInformation_ = (
  data: GoogleAppsScript.Drive.Folder | GoogleAppsScript.Drive.File
): (string | number | boolean)[] => {
  const name = data.getName();
  const id = data.getId();
  const url = data.getUrl();

  const accessClass = safeGet_(() => String(data.getSharingAccess()));
  const perm = safeGet_(() => String(data.getSharingPermission()));
  const owner = safeGet_(() => data.getOwner()?.getEmail() ?? '');

  const editors = safeGet_(() =>
    data
      .getEditors()
      .map((e: GoogleAppsScript.Base.User) => e.getEmail())
      .join('\n')
  );

  const viewers = safeGet_(() =>
    data
      .getViewers()
      .map((v: GoogleAppsScript.Base.User) => v.getEmail())
      .join('\n')
  );

  const shortcutFolderId = safeGet_(() => {
    /**
     * MIMEタイプに関する定数
     */
    const MIME_TYPE = {
      /** Google ドライブのショートカット */
      SHORTCUT: 'application/vnd.google-apps.shortcut',
    };
    try {
      const targetFile = DriveApp.getFileById(data.getId());
      const mimeType = targetFile.getMimeType();

      if (mimeType !== MIME_TYPE.SHORTCUT) {
        return '';
      }

      return targetFile.getTargetId() ?? '';
    } catch {
      return '';
    }
  });
  let isPublishedToWeb = '';
  try {
    const targetFile = DriveApp.getFileById(data.getId());
    const mimeType = targetFile.getMimeType();

    if (mimeType !== MimeType.FOLDER) {
      isPublishedToWeb = safeGet_(() => isPublishedToWeb_(data.getId()));
    } else {
      isPublishedToWeb = 'フォルダ';
    }
  } catch {
    isPublishedToWeb = consts.LABEL.NO_GET;
  }

  return [
    name,
    id,
    url,
    accessClass,
    perm,
    owner,
    editors,
    viewers,
    isPublishedToWeb,
    shortcutFolderId,
  ];
};

function isPublishedToWeb_(fileId: string): string {
  // Drive API が有効であることを TypeScript に保証する

  if (typeof Drive === 'undefined') {
    throw new Error(
      'Drive API (Advanced Google Service) が有効になっていません。'
    );
  }

  try {
    // Drive.Revisions が undefined の可能性も考慮してオプショナルチェイニングを使用

    const revisions = Drive.Revisions?.list(fileId);

    if (!revisions) return '!!取得不可!!';

    // 型定義の不整合を回避しつつ items を取得

    const items = (revisions as any).items as
      | GoogleAppsScript.Drive.Schema.Revision[]
      | undefined;

    if (!items) return '!!取得不可!!';

    return items.some(revision => revision.published === true)
      ? '公開'
      : '非公開';
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('エラー: ' + e.message);
    }

    return '非公開';
  }
}
