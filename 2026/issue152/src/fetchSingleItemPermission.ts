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
import * as Constants from './const';

/**
 * 実行関数：PREシートからデータを読み込み、「!取得不可!」の行のみ権限を再取得して
 * 最終的な権限一覧シートに出力します。
 */
export function execFetchSingleItemPermission_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inputSheet = ss.getSheetByName(Constants.SHEET_NAME_PERMISSIONS_PRE);
  let outputSheet = ss.getSheetByName(Constants.SHEET_NAME_PERMISSIONS);

  if (!inputSheet) {
    console.error(
      `入力シート "${Constants.SHEET_NAME_PERMISSIONS_PRE}" が見つかりません。`
    );
    return;
  }
  if (!outputSheet) {
    outputSheet = ss.insertSheet(Constants.SHEET_NAME_PERMISSIONS);
  }

  outputSheet.clear();

  const lastRow = inputSheet.getLastRow();
  const lastCol = inputSheet.getLastColumn();
  if (lastRow < 2) return;

  // 1. 全データを取得（見出し含む）
  const allData = inputSheet.getRange(1, 1, lastRow, lastCol).getValues();
  const header = allData[0];
  const rows = allData.slice(1);

  // 2. 「!取得不可!」がいずれかの列（F, I, J）にある行を特定して情報を更新
  const processedRows = rows.map((row, index) => {
    const accessClassValue = String(row[5]); // F列: アクセス種別
    const editorsValue = String(row[8]); // I列: 編集者
    const viewersValue = String(row[9]); // J列: 閲覧者
    const targetId = String(row[3]); // D列: ID

    // F列, I列, J列のいずれかが "!取得不可!" かつ IDが存在する場合に再取得
    const isMissingData =
      accessClassValue === '!取得不可!' ||
      editorsValue === '!取得不可!' ||
      viewersValue === '!取得不可!';

    if (isMissingData && targetId) {
      console.log(`${index + 2}行目: 不足情報を再取得中 (ID: ${targetId})`);

      // 権限情報を取得
      const newInfo = fetchSingleItemPermissionData_(targetId);

      if (newInfo) {
        // F列からJ列（Index 5〜9）を最新情報で上書き
        // newInfo: [名前(0), ID(1), URL(2), アクセス種別(3), 権限(4), オーナー(5), 編集者(6), 閲覧者(7), ショートカット元(8)]
        row[5] = newInfo[3]; // アクセス種別
        row[6] = newInfo[4]; // 権限
        row[7] = newInfo[5]; // オーナー
        row[8] = newInfo[6]; // 編集者
        row[9] = newInfo[7]; // 閲覧者
      }
    }
    return row;
  });

  // 3. 出力シートに一括書き出し
  const outputData = [header, ...processedRows];
  outputSheet.getRange(1, 1, outputData.length, lastCol).setValues(outputData);

  // レイアウト調整
  outputSheet.getRange(1, 1, 1, lastCol).setFontWeight('bold');
  outputSheet.setFrozenRows(1);
  outputSheet.getDataRange().setWrap(true);

  console.log('「!取得不可!」アイテムの更新処理が完了しました。');
}

/**
 * 指定したIDの権限データのみを抽出して返す内部関数
 */
function fetchSingleItemPermissionData_(targetId: string): string[] | null {
  try {
    let item: GoogleAppsScript.Drive.File | GoogleAppsScript.Drive.Folder;
    try {
      item = DriveApp.getFileById(targetId);
    } catch {
      item = DriveApp.getFolderById(targetId);
    }
    return getDataInformation_(item);
  } catch {
    console.error(`ID: ${targetId} の再取得に失敗しました。`);
    return null;
  }
}

/**
 * ファイル/フォルダから詳細情報を抽出
 */
function getDataInformation_(
  data: GoogleAppsScript.Drive.File | GoogleAppsScript.Drive.Folder
): string[] {
  const name = data.getName();
  const id = data.getId();
  const url = data.getUrl();

  const accessClass = safeGet_(() => String(data.getSharingAccess()), '');
  const perm = safeGet_(() => String(data.getSharingPermission()), '');
  const owner = safeGet_(() => data.getOwner()?.getEmail() ?? '', '');

  const editors = safeGet_(
    () =>
      data
        .getEditors()
        .map(e => e.getEmail())
        .join('\n'),
    ''
  );

  const viewers = safeGet_(
    () =>
      data
        .getViewers()
        .map(v => v.getEmail())
        .join('\n'),
    ''
  );

  const shortcutTargetId = safeGet_(() => {
    const file = DriveApp.getFileById(data.getId());
    return file.getMimeType() === MimeType.SHORTCUT
      ? (file.getTargetId() ?? '')
      : '';
  }, '');

  return [
    name,
    id,
    url,
    accessClass,
    perm,
    owner,
    editors,
    viewers,
    shortcutTargetId,
  ];
}

function safeGet_<T>(fn: () => T, defaultValue: T): T {
  try {
    return fn();
  } catch {
    return defaultValue;
  }
}
