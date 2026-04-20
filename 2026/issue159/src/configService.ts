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
import * as consts from './consts';
/**
 * フォルダ移行等に必要な環境設定（スクリプトプロパティ）を一括設定します。
 * @param {string} targetFolderId - 対象となるルートフォルダのID
 */
function setScriptProperties_(targetFolderId: string) {
  PropertiesService.getScriptProperties().setProperty(
    consts.PROP_KEY.TARGET_FOLDER_ID,
    targetFolderId
  );
}

/**
 * スクリプトプロパティ 'TARGET_ROOT_FOLDER_ID' を基に設定処理を実行します。
 * @throws {Error} TARGET_ROOT_FOLDER_ID が未設定の場合
 */
export function execSetProperties_() {
  const targetFolderId = PropertiesService.getScriptProperties().getProperty(
    consts.PROP_KEY.TARGET_ROOT_FOLDER_ID
  );
  if (!targetFolderId) {
    throw new Error(
      `${consts.PROP_KEY.TARGET_ROOT_FOLDER_ID} is not set in Script Properties.`
    );
  }
  if (targetFolderId === consts.LABEL.FOLDER_ID_HERE) {
    throw new Error(
      `Please set the actual folder ID for ${consts.PROP_KEY.TARGET_ROOT_FOLDER_ID} in the code.`
    );
  }
  setScriptProperties_(targetFolderId);
}
