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
// スクリプトプロパティのキー（共有ドライブIDを格納）
export const SCRIPT_PROPERTY_KEY = 'SHARED_DRIVE_ID';
// 出力先シート名
export const OUTPUT_SHEET_NAME = 'ファイル一覧';
// スライド一覧の出力先シート名
export const SLIDE_OUTPUT_SHEET_NAME = 'スライド一覧';
// 取得対象のMIMEタイプ
export const MIME_DOCUMENT = 'application/vnd.google-apps.document';
export const MIME_SPREADSHEET = 'application/vnd.google-apps.spreadsheet';
export const MIME_PRESENTATION = 'application/vnd.google-apps.presentation';
// Drive API の1ページあたり取得件数（最大1000）
export const PAGE_SIZE = 1000;

// ウェブ公開状態を判定する対象シート名
export const ARO_EXTERNAL_SHEET_NAME = 'ARO外部共有';
export const ARO_INTERNAL_SHEET_NAME = 'ARO内部のみ共有';
// ウェブ公開状態の出力ラベル
export const PUBLISHED_LABEL = 'Webに公開中、内部のみに移動不可';
export const UNPUBLISHED_LABEL = '非公開';
