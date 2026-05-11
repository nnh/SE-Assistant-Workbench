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
import { hello } from './example-module';
import { CONFIG } from './config';
import {
  fetchRawSharedData_,
  filterValidFolders_,
  saveToMiddleSheet_,
  generateFinalFormattedList_,
} from './extractSharedFolderList';
import {
  fetchDriveItemsFromPathList_,
  exportNotFoundFolders_,
  fetchPartialFolderUrl_,
  createMissingFoldersFromList_,
} from './driveFolderIntegrity';
import { filterValidfiles_, generateFinalFormattedFileList_ } from './issue164';

function updateFormattedSharedFilesList() {
  try {
    // 1. 外部SSから生データを取得
    const rawData = fetchRawSharedData_();

    // 2. ファイルのみを抽出し不要なものを除外
    const filteredData = filterValidfiles_(rawData);

    // 3. 中間シートへ保存
    saveToMiddleSheet_(filteredData, CONFIG.SHEET_NAMES.MIDDLEFILE);

    // 4. パス整形を行い最終レポートを生成
    generateFinalFormattedFileList_();

    console.log('共有ファイル一覧の更新が正常に完了しました。');
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('共有ファイル更新処理でエラーが発生:', e.message);
    } else {
      console.error('予期せぬエラー:', String(e));
    }
  }
}

/**
 * フォルダ作成処理を実行するラッパー関数
 */
function runMissingFolderCreation() {
  try {
    createMissingFoldersFromList_();
    console.log(
      '不足フォルダの作成処理が完了しました。詳細はログを確認してください。'
    );
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('実行エラー:', e.message);
    } else {
      console.error('予期せぬエラー:', String(e));
    }
  }
}
/**
 * ドライブ上の実在確認の結果、存在しなかったフォルダのリストを生成する
 */
function generateNotFoundFolderReport() {
  try {
    exportNotFoundFolders_();
    fetchPartialFolderUrl_();
    console.log('不在フォルダリストの更新が完了しました。');
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('レポート生成エラー:', e.message);
    } else {
      console.error('予期せぬエラー:', String(e));
    }
  }
}

/**
 * 整形済みリストのパスを元に、Googleドライブ内の実在確認を行いURLを取得する
 */
function updateDriveFolderUrlReport() {
  try {
    fetchDriveItemsFromPathList_();
    console.log('フォルダURLの抽出が正常に完了しました。');
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('URL抽出エラー:', e.message);
    } else {
      console.error('予期せぬエラー:', String(e));
    }
  }
}

/**
 * 外部共有フォルダ一覧を取得・整形し、スプレッドシートを最新状態に更新する
 * (fetch -> filter -> save -> format)
 */
function updateFormattedSharedFolderList() {
  try {
    // 1. 外部SSから生データを取得
    const rawData = fetchRawSharedData_();

    // 2. フォルダのみを抽出し不要なものを除外
    const filteredData = filterValidFolders_(rawData);

    // 3. 中間シートへ保存
    saveToMiddleSheet_(filteredData, CONFIG.SHEET_NAMES.MIDDLE);

    // 4. パス整形を行い最終レポートを生成
    generateFinalFormattedList_();

    console.log('共有フォルダ一覧の更新が正常に完了しました。');
  } catch (e: unknown) {
    if (e instanceof Error) {
      console.error('共有フォルダ更新処理でエラーが発生:', e.message);
    } else {
      console.error('予期せぬエラー:', String(e));
    }
  }
}
console.log(hello());
