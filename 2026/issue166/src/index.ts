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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { executeExport_ } from './sharedFolderAudit';
/**
 * 「内部共有のみ」フォルダの情報を出力
 */
function outputInternalFolderPermissions() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const folderId = scriptProperties.getProperty('INTERNAL_FOLDER_ID');

  if (!folderId) {
    console.error("プロパティ 'INTERNAL_FOLDER_ID' が未設定です。");
    return;
  }

  // 第2引数はシート名のプレフィックス（任意に変更可能）
  executeExport_(folderId, '内部共有のみ', 1);
}

/**
 * 「外部共有あり」フォルダの情報を出力
 */
function outputExternalFolderPermissions() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const folderId = scriptProperties.getProperty('EXTERNAL_FOLDER_ID');

  if (!folderId) {
    console.error("プロパティ 'EXTERNAL_FOLDER_ID' が未設定です。");
    return;
  }

  // 第2引数はシート名のプレフィックス（任意に変更可能）
  executeExport_(folderId, '外部共有あり', 2);
}
