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
/* eslint-disable @typescript-eslint/no-unused-vars */
import {exportSharedDriveFileList_} from './sharedDriveFiles';
import {exportSharedDriveSlideList_} from './sharedDriveSlides';
import {updatePublishStatus_} from './publishStatus';
import {
  ARO_EXTERNAL_SHEET_NAME,
  ARO_INTERNAL_SHEET_NAME,
  SLIDE_OUTPUT_SHEET_NAME,
} from './constants';

/**
 * エントリポイント。スクリプトエディタやトリガーから実行する。
 * 実処理は sharedDriveFiles.ts に分離している。
 */
function listSharedDriveFiles(): void {
  exportSharedDriveFileList_();
}

/**
 * エントリポイント。スクリプトエディタやトリガーから実行する。
 * 実処理は sharedDriveSlides.ts に分離している。
 */
function listSharedDriveSlides(): void {
  exportSharedDriveSlideList_();
}

/**
 * エントリポイント。「ARO外部共有」シートのウェブ公開状態を判定する。
 * 実処理は publishStatus.ts に分離している。
 */
function checkAroExternalSharePublishStatus(): void {
  updatePublishStatus_(ARO_EXTERNAL_SHEET_NAME);
}

/**
 * エントリポイント。「ARO内部のみ共有」シートのウェブ公開状態を判定する。
 * 実処理は publishStatus.ts に分離している。
 */
function checkAroInternalSharePublishStatus(): void {
  updatePublishStatus_(ARO_INTERNAL_SHEET_NAME);
}

/**
 * エントリポイント。「スライド一覧」シートのウェブ公開状態を判定する。
 * 実処理は publishStatus.ts に分離している。
 */
function checkSlidePublishStatus(): void {
  updatePublishStatus_(SLIDE_OUTPUT_SHEET_NAME);
}
