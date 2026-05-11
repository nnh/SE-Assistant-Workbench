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
 * プロジェクト全体の共通設定
 */
export const CONFIG = {
  // スクリプトプロパティのキー
  PROPERTY_KEYS: {
    SS_ID: 'SPREADSHEET_ID',
    SOURCE_DRIVE_FOLDER_ID: 'SOURCE_DRIVE_FOLDER_ID',
  },

  // シート名
  SHEET_NAMES: {
    SOURCE: '外部共有フォルダ・ファイル',
    MIDDLE: 'マイドライブ配下のフォルダ一覧抽出',
    FINAL: 'フォルダ名編集済み一覧',
    DRIVE_CONTENTS_1: '共有ドライブ配下のフォルダ情報_1',
    NOT_FOUND_LIST: 'フォルダ不在確認リスト',
    MIDDLEFILE: 'マイドライブ配下のファイル一覧抽出',
    FINALFILE: 'ファイル名編集済み一覧',
  },

  // パス編集用の文字列
  PATH_RULES: {
    ROOT_PREFIX: '外部共有フォルダ/',
    AMED_OLD_PATH: 'AMED 2025 CDISC/',
    AMED_NEW_PATH: '情報システム研究室(ISR)/Grant/AMED 2025 CDISC/',
  },

  // 除外設定（B列の先頭が以下の文字列で始まる場合は除外）
  IGNORE_PREFIXES: [
    '外部共有フォルダ/空のフォルダ（削除予定）',
    '外部共有フォルダ/Templates',
    '外部共有フォルダ/Protocol Templates',
    '外部共有フォルダ/研究管理室',
  ],
} as const; // as const をつけることで読み取り専用（型安全）になります
