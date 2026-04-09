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
 * スプレッドシートのシート名に関する定数
 */
export const SHEET_NAME = {
  /** 権限情報を出力するメインシート */
  PERMISSION: '共有権限',
  /** 処理済みのIDを記録するシート */
  DONE: '検索済み',
  /** 検索対象外（走査自体をスキップする）フォルダIDを指定するシート */
  SEARCH_EXCLUDE: '検索対象外フォルダ',
  /** 【新規】基本情報を抽出したシート */
  BASIC_INFO: '基本情報',
  /** 【新規】アクセス種別（共有設定）を抽出したシート */
  ACCESS_INFO: 'アクセス種別',
  /** 【新規】編集者一覧を抽出したシート */
  EDITOR_LIST: '編集者リスト',
  /** 【新規】閲覧者一覧を抽出したシート */
  VIEWER_LIST: '閲覧者リスト',
  /** 外部共有アイテムリストを抽出したシート */
  EXTERNAL_SHARED_ITEMS: '外部共有アイテムリスト',
  /** 外部共有フォルダリストを抽出したシート */
  EXTERNAL_SHARED_FOLDERS: '外部共有フォルダリスト',
  /** 外部共有ファイルリストを抽出したシート */
  EXTERNAL_SHARED_FILES: '外部共有ファイルリスト',
} as const;

/**
 * スクリプトプロパティのキーに関する定数
 */
export const PROP_KEY = {
  /** 走査を開始するルートフォルダのID（初期設定用） */
  TARGET_ROOT_FOLDER_ID: 'TARGET_ROOT_FOLDER_ID',
  /** 内部処理で使用するターゲットフォルダID */
  TARGET_FOLDER_ID: 'TARGET_FOLDER_ID',
  /** 最後に処理したフォルダのパス */
  TARGET_PATH: 'TARGET_PATH',
  /** フォルダ、ファイル移動先のルートフォルダID */
  DESTINATION_ROOT_FOLDER_ID: 'DESTINATION_ROOT_FOLDER_ID',
} as const;

/**
 * 表示ラベル・メッセージに関する定数
 */
export const LABEL = {
  /** 取得失敗時（権限不足など）に表示する文字列 */
  NO_GET: '!取得不可!',
  FOLDER_ID_HERE: 'FOLDER_ID_HERE',
} as const;

/**
 * MIMEタイプに関する定数
 */
export const MIME_TYPE = {
  /** Google ドライブのショートカット */
  SHORTCUT: 'application/vnd.google-apps.shortcut',
} as const;
