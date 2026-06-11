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
  POLICY_REPORT_JSON_FOLDER_ID: 'SAVE_DESTINATION_FOLDER_ID', // 共有ドライブ設定レポートのJSON保存先はアーカイブJSONと同じ
  PERMISSION_JSON_FOLDER_ID: 'PERMISSION_SAVE_DESTINATION_FOLDER_ID', // アクセス権限JSONの保存先
  DRIVE_NAME: 'DRIVE_NAME', // 直近で処理したドライブの名前を保存するプロパティキー

  // レポート関連
  OUTPUT_SPREADSHEET_ID: 'OUTPUT_SPREADSHEET_ID', // レポート出力先のスプレッドシートID

  // キュー管理（共有ドライブのIDなど）
  TARGET_SHARED_DRIVE_ID: 'TARGET_SHARED_DRIVE_ID', // 対象の共有ドライブIDリスト（カンマ区切り）
  POLICY_REPORT_TARGET_DRIVE_IDS: 'POLICY_REPORT_TARGET_DRIVE_IDS', // 共有ドライブ設定レポートの対象ドライブID（カンマ区切り）
} as const;

export const REPORT_HEADERS: {
  DRIVE_ITEM: readonly string[];
  SHARED_DRIVE_POLICY: readonly string[];
  PERMISSION: readonly string[];
} = {
  DRIVE_ITEM: [
    'ID',
    'アイテム種別',
    '親フォルダパス',
    '名前',
    '作成日時',
    '更新日時',
  ],
  SHARED_DRIVE_POLICY: ['ドライブID', 'ドライブ名', '設定', '出力日時'],
  PERMISSION: ['アイテムID', '権限', '継承'],
} as const;
// シート名
export const SHEET_NAME = {
  PERMISSION: '権限一覧',
  PERMISSION_ARCHIVE_WORK: '作業用_パーミッション未取得IDリスト',
  PERMISSION_TARGET_ID_LIST: '作業用_権限出力対象IDリスト',
  SHARED_DRIVE: '共有ドライブ自体の設定',
  EXCLUDE_PATH_MASTER: '権限取得対象外親フォルダパス',
  EXTERNAL_ACCOUNT_LIST: 'aro.staff以外のアカウント',
  EXTERNAL_ACCOUNT_PERMISSION: '外部アカウント権限一覧',
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
    PERMISSION: 'permission',
    SHARED_DRIVE_POLICY: '共有ドライブ設定',
  },
} as const;

// インデックス
export const INDEX = {
  PERMISSION_ARRAY: {
    FILENAME: 0,
    ID: 1,
    TYPE: 2,
    DISPLAY_NAME: 3,
    ROLE: 4,
    EMAIL_ADDRESS: 5,
    DELETED: 6,
    DETAIL_PERMISSION_TYPE: 7,
    DETAIL_INHERITED_FROM: 8,
    DETAIL_ROLE: 9,
    INHERITED: 10,
  },
  MERGE_DRIVE_PERMISSION: {
    DRIVE_SHEET_KEY: 0,
    PERMISSION_SHEET_KEY: 0,
    PERMISSION_PERMISSION: 1,
  },
} as const;

export const FILTER_MODE = {
  ALL: 'ALL',
  PERIOD: 'PERIOD',
  RECENT_2_DAYS: 'RECENT_2_DAYS',
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

// アクセス権限
export interface PermissionResponse {
  kind: string;
  permissions: PermissionItem[];
}
// https://developers.google.com/workspace/drive/api/reference/rest/v3/permissions?hl=ja#Permission
export interface PermissionItem {
  id: string;
  displayName?: string;
  type: string;
  permissionDetails?: Array<{
    permissionType?: string;
    inheritedFrom?: string;
    role?: string;
    inherited: boolean;
  }>;
  emailAddress?: string;
  role?: string;
  allowFileDiscovery?: boolean;
  domain?: string;
  deleted?: boolean;
  view?: string;
}
