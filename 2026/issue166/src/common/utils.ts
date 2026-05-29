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
 * utils.ts
 * 共通の便利関数を定義します。
 */

export function getFolderById_(
  folderId: string
): GoogleAppsScript.Drive.Folder {
  try {
    return DriveApp.getFolderById(folderId);
  } catch (e) {
    throw new Error(
      `フォルダID「${folderId}」のフォルダを取得できませんでした: ${e}`
    );
  }
}
export function getFolderByPropertyKey_(
  propertyKey: string
): GoogleAppsScript.Drive.Folder {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty(propertyKey);
  if (!folderId) {
    throw new Error(
      `プロパティ ${propertyKey} が設定されていません。スクリプトプロパティにフォルダIDを設定してください。`
    );
  }
  return getFolderById_(folderId);
}

export const DateUtils = {
  /**
   * 指定したフォーマットで日付文字列を取得する
   * @param date 対象の日付（未指定時は現在時刻）
   * @param format フォーマット（デフォルトは 'yyyyMMdd_HHmm'）
   */
  getFormattedDate(date: Date = new Date(), format = 'yyyyMMdd_HHmm'): string {
    return Utilities.formatDate(date, 'JST', format);
  },
} as const;
