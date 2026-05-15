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
 * const.ts
 * システム全体で共通して使用するスクリプトプロパティのキーや定数を定義します。
 */

export const PROPERTY_KEYS = {
  // フォルダID関連
  JSON_FOLDER_ID: 'SAVE_DESTINATION_FOLDER_ID', // アーカイブJSONの保存先

  // レポート関連
  OUTPUT_SPREADSHEET_ID: 'OUTPUT_SPREADSHEET_ID', // レポート出力先のスプレッドシートID

  // システムの状態・キャッシュ

  // キュー管理（共有ドライブのIDなど）
  TARGET_SHARED_DRIVE_IDS: 'TARGET_SHARED_DRIVE_IDS', // 対象の共有ドライブIDリスト（カンマ区切り）
  TODO_DRIVE_IDS: 'TODO_DRIVE_IDS', // 処理待ちドライブのリスト
  DONE_DRIVE_IDS: 'DONE_DRIVE_IDS', // 処理完了済みのドライブID
  POLICY_REPORT_TARGET_DRIVE_IDS: 'POLICY_REPORT_TARGET_DRIVE_IDS', // 共有ドライブ設定レポートの対象ドライブID（カンマ区切り）
} as const;

export const REPORT_HEADERS: {
  DRIVE_ITEM: readonly string[];
  SHARED_DRIVE_POLICY: readonly string[];
} = {
  DRIVE_ITEM: [
    'ID',
    'アイテム種別',
    '親フォルダパス',
    '名前',
    '作成日時',
    '更新日時',
  ],
  SHARED_DRIVE_POLICY: ['ドライブID', 'ドライブ名', '設定'],
} as const;

// MIME_TYPE
export const MIME_TYPES = {
  FOLDER: 'application/vnd.google-apps.folder',
} as const;

// dummyなどの定数
export const DUMMY_VALUE = 'dummy';
export const FOLDER_JP = 'フォルダ';
export const FILE_JP = 'ファイル';

// 共有ドライブ名
export const SHARED_DRIVE_NAME = {
  EXTERNAL: 'ARO外部共有',
  INTERNAL: 'ARO内部のみ共有',
} as const;

// 出力ファイル名のフォーマット
export const OUTPUT_FILE_NAME = {
  PREFIX: {
    DRIVE_ITEM: 'フォルダ構成',
    PERMISSION: 'アクセス権限',
    SHARED_DRIVE_POLICY: '共有ドライブ設定',
  },
} as const;

/**
 * アーカイブJSONの1アイテム（ファイルまたはフォルダ）の構造
 */
export interface ArchivedItem {
  id: string;
  name: string;
  itemType: string; // "フォルダ" または "ファイル"
  parentPath: string;
  mimeType: string;
  createdTime: string;
  parents: string[];
  modifiedTime: string;
}
