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
import { exportSubfolderNames_, getFoldersInSharedDrive_ } from './issue150';

function getSharedDriveFolderList() {
  const values: string[][] = getFoldersInSharedDrive_();
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      '共有ドライブ配下のフォルダ'
    );
  sheet?.clearContents();
  if (values.length > 0) {
    sheet?.getRange(1, 1, values.length, values[0].length).setValues(values);
  }
}

function getAroFolderList() {
  // 引数：(スクリプトプロパティのキー, 出力先のシート名)
  exportSubfolderNames_('ARO_FOLDER_ID', 'ARO配下のフォルダ');
}

/**
 * 2つのシートを比較し、共有ドライブ側に存在しないフォルダ名を
 * 「差分」シートに出力する
 */
function exportMissingFoldersToSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1. 各シートの取得
  const sheetAro = ss.getSheetByName('ARO配下のフォルダ');
  const sheetShared = ss.getSheetByName('共有ドライブ配下のフォルダ');

  if (!sheetAro || !sheetShared) {
    console.error(
      '比較元のシート（ARO配下 または 共有ドライブ配下）が見つかりません。'
    );
    return;
  }

  // 2. データの取得（2行目以降）
  // ARO配下：A列（1列目）を取得
  const aroLastRow = sheetAro.getLastRow();
  const aroValues =
    aroLastRow > 1
      ? sheetAro
          .getRange(2, 1, aroLastRow - 1, 1)
          .getValues()
          .flat()
      : [];

  // 共有ドライブ配下：B列（2列目）を取得
  const sharedLastRow = sheetShared.getLastRow();
  const sharedValues =
    sharedLastRow > 1
      ? sheetShared
          .getRange(2, 2, sharedLastRow - 1, 1)
          .getValues()
          .flat()
      : [];

  // 3. 比較ロジック（Setを使用して高速抽出）
  const sharedSet = new Set(sharedValues.map(String)); // 文字列として比較
  const diffNames = aroValues
    .filter(name => name && !sharedSet.has(String(name))) // AROにあってSharedにないもの
    .map(name => [name]); // 書き込み用に二次元配列化 [[name1], [name2], ...]

  // 4. 「差分」シートの準備と書き出し
  const diffSheetName = '差分';
  let sheetDiff = ss.getSheetByName(diffSheetName);

  if (!sheetDiff) {
    sheetDiff = ss.insertSheet(diffSheetName);
  }

  // シートをクリアしてヘッダーとデータを書き込む
  sheetDiff.clearContents();
  sheetDiff.getRange(1, 1).setValue('共有ドライブに存在しないフォルダ名');
  sheetDiff.getRange(1, 1).setFontWeight('bold').setBackground('#f3f3f3');

  if (diffNames.length > 0) {
    sheetDiff.getRange(2, 1, diffNames.length, 1).setValues(diffNames);
    console.log(`「差分」シートに ${diffNames.length} 件出力しました。`);
    sheetDiff.activate(); // 完了後、差分シートを表示
  } else {
    sheetDiff.getRange(2, 1).setValue('差分はありませんでした。');
    console.log('差分は見つかりませんでした。');
  }
}

/**
 * Drive API (v3) を使用して、共有ドライブのメンバーを含む
 * フォルダの全権限詳細を取得する。
 * 出力項目に「フォルダURL」を追加しました。
 */
function exportFolderPermissionsAdvanced(): void {
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet =
    SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    ss.getSheetByName('共有ドライブ配下のフォルダ');

  if (!sourceSheet) {
    console.error('シート「共有ドライブ配下のフォルダ」が見つかりません。');
    return;
  }

  const lastRow: number = sourceSheet.getLastRow();
  if (lastRow < 2) return;

  const sourceData: string[][] = sourceSheet
    .getRange(2, 1, lastRow - 1, 2)
    .getValues()
    .map(row => row.map(String));

  const results: string[][] = [];

  sourceData.forEach((row: string[]) => {
    const folderId = row[0];
    const folderName = row[1];

    if (!folderId) return;

    // フォルダIDからURLを生成
    const folderUrl = `https://drive.google.com/drive/u/0/folders/${folderId}`;

    try {
      if (typeof Drive === 'undefined' || !Drive.Permissions) {
        throw new Error('Drive APIを有効にしてください。');
      }

      const response = Drive.Permissions?.list(folderId, {
        supportsAllDrives: true,
        fields: 'permissions(id, emailAddress, role, type, displayName)',
      });

      if (response && response.permissions) {
        response.permissions.forEach(
          (perm: GoogleAppsScript.Drive_v3.Drive.V3.Schema.Permission) => {
            results.push([
              folderId,
              folderName,
              folderUrl, // 追加: フォルダURL
              perm.displayName || '名前なし',
              perm.emailAddress || '(不明)',
              perm.role || '不明',
              perm.type || '不明',
            ]);
          }
        );
      }
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : '取得エラー';
      results.push([
        folderId,
        folderName,
        folderUrl,
        'エラー',
        errorMessage,
        '-',
        '-',
      ]);
    }
  });

  const outputSheetName = 'フォルダ共有設定詳細';
  const outputSheet =
    ss.getSheetByName(outputSheetName) || ss.insertSheet(outputSheetName);

  outputSheet.clearContents();
  const header: string[][] = [
    [
      'Folder ID',
      'Drive Name',
      'フォルダURL', // 追加: ヘッダー
      'ユーザー名',
      'メールアドレス',
      'ロール',
      'タイプ',
    ],
  ];
  outputSheet
    .getRange(1, 1, 1, header[0].length)
    .setValues(header)
    .setBackground('#f3f3f3')
    .setFontWeight('bold');

  if (results.length > 0) {
    outputSheet
      .getRange(2, 1, results.length, results[0].length)
      .setValues(results);

    // URL列にリンクを設定したい場合は、以下の処理を追加することも可能です
    // outputSheet.getRange(2, 3, results.length, 1).setWrap(false);

    console.log(`詳細権限を ${results.length} 件出力しました。`);
    outputSheet.activate();
  }
}
console.log(hello());
