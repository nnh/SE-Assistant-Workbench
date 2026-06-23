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

// 走査対象の共有ドライブID。スクリプトプロパティ SHARED_DRIVE_ID に設定する
export const SHARED_DRIVE_ID_KEY = 'SHARED_DRIVE_ID';

// 結果を書き込むシート名
export const OUTPUT_SHEET_NAME = 'permissions';

// 取得するPermissionのフィールド（Drive API v3）
export const PERMISSION_FIELDS =
  'displayName,type,emailAddress,allowFileDiscovery,domain,deleted,view,' +
  'permissionDetails(role,inherited)';

// files.list で取得するフィールド。共有ドライブでは permissions が
// インラインで返らないため、ここでは取得せずファイルごとに permissions.list で取る
export const FILE_FIELDS = 'nextPageToken, files(id,name,mimeType,parents)';

// permissions.list で取得するフィールド
export const PERMISSION_LIST_FIELDS =
  'nextPageToken, permissions(' + PERMISSION_FIELDS + ')';

// 出力ヘッダ（1行＝1ファイルの1権限明細）
export const HEADER = [
  'パス',
  'ファイルID',
  'ファイル名',
  '種類',
  '表示名',
  '付与先種別',
  'メールアドレス',
  'ドメイン',
  'ロール',
  '継承',
  '検索許可',
  'アカウント削除',
  'ビュー',
];

// type（付与先種別）の日本語ラベル
export const PERMISSION_TYPE_LABELS: {[type: string]: string} = {
  user: 'ユーザー',
  group: 'グループ',
  domain: 'ドメイン',
  anyone: 'リンクを知っている全員',
};

// 表示名(E列)がこの値でメールアドレス(G列)が空の場合、メール列に表示名を補完する
export const DISPLAY_NAME_TO_EMAIL =
  '独立行政法人国立病院機構名古屋医療センター';

// role（ロール）の日本語ラベル
export const ROLE_LABELS: {[role: string]: string} = {
  owner: 'オーナー',
  organizer: '管理者',
  fileOrganizer: 'コンテンツ管理者',
  writer: '編集者',
  commenter: 'コメント可',
  reader: '閲覧者',
};

// mimeType を日本語ラベルに変換するための対応表
export const MIME_TYPE_LABELS: {[mimeType: string]: string} = {
  'application/vnd.google-apps.folder': 'フォルダ',
  'application/vnd.google-apps.document': 'Google ドキュメント',
  'application/vnd.google-apps.spreadsheet': 'Google スプレッドシート',
  'application/vnd.google-apps.presentation': 'Google スライド',
  'application/vnd.google-apps.form': 'Google フォーム',
  'application/vnd.google-apps.drawing': 'Google 図形描画',
  'application/vnd.google-apps.map': 'Google マイマップ',
  'application/vnd.google-apps.site': 'Google サイト',
  'application/vnd.google-apps.script': 'Google Apps Script',
  'application/vnd.google-apps.shortcut': 'ショートカット',
  'application/pdf': 'PDF',
  'application/msword': 'Word',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'Word',
  'application/vnd.ms-excel': 'Excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel',
  'application/vnd.ms-powerpoint': 'PowerPoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'PowerPoint',
  'application/zip': 'ZIP',
  'text/plain': 'テキスト',
  'text/csv': 'CSV',
  'image/jpeg': 'JPEG画像',
  'image/png': 'PNG画像',
  'image/gif': 'GIF画像',
};
