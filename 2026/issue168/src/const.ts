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
export const SHEET_NAME = {
  AUDIT_LOG: '監査ログ',
  ACCOUNT: '対象アカウント',
  FILE: 'ファイル情報',
  SHARED_DRIVE_ID: '共有ドライブID',
  OUTPUT: '出力',
} as const;

export const FILE_INFO = {
  MY_DRIVE: 'マイドライブ',
  ERROR:
    '[Error] ファイル情報の取得に失敗しました（IDが違うか、権限がありません）',
} as const;
