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
import { CONFIG } from './config';
/**
 * フォルダ名編集済み一覧シートのB列（パス）を元に、
 * Googleドライブ内の実体を探索し、URLをM列に出力する
 */
export const fetchDriveItemsFromPathList_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const listSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.FINAL);

  if (!listSheet) {
    throw new Error(
      `リストシート「${CONFIG.SHEET_NAMES.FINAL}」が見つかりません。`
    );
  }

  // 1. スクリプトプロパティからルートとなるフォルダIDを取得
  const rootFolderId = PropertiesService.getScriptProperties().getProperty(
    CONFIG.PROPERTY_KEYS.SOURCE_DRIVE_FOLDER_ID
  );
  if (!rootFolderId) {
    throw new Error(
      `プロパティ ${CONFIG.PROPERTY_KEYS.SOURCE_DRIVE_FOLDER_ID} が未設定です。`
    );
  }

  // 2. データの取得（B列を取得）
  const lastRow = listSheet.getLastRow();
  if (lastRow <= 1) return; // 見出しのみ、またはデータなしの場合は終了

  // B列（インデックス1）のデータを一括取得
  const bColumnValues = listSheet.getRange(1, 2, lastRow, 1).getValues();

  // 結果を格納する配列（M列用）
  const results: string[][] = [['フォルダURL_1']]; // M1の見出し

  // 3. パスを1行ずつループ処理（2行目以降）
  for (let i = 1; i < bColumnValues.length; i++) {
    const fullPath = String(bColumnValues[i][0]).trim();

    if (!fullPath) {
      results.push(['']); // 空白行なら空を返す
      continue;
    }

    // パスを「/」で分割し、空の要素を取り除く
    const pathParts = fullPath.split('/').filter(part => part.length > 0);

    try {
      let currentFolder = DriveApp.getFolderById(rootFolderId);
      let found = true;

      // 階層を順番に辿る
      for (const part of pathParts) {
        const subFolders = currentFolder.getFoldersByName(part);
        if (subFolders.hasNext()) {
          currentFolder = subFolders.next(); // 次の階層へ
        } else {
          found = false;
          break; // フォルダが存在しない
        }
      }
      // foundがtrueの場合、さらにその下にC列の名称のフォルダが存在するか確認する
      if (found) {
        const cValue = String(listSheet.getRange(i + 1, 3).getValue()).trim(); // C列の値
        if (cValue) {
          const finalSubFolders = currentFolder.getFoldersByName(cValue);
          found = finalSubFolders.hasNext(); // C列のフォルダが存在するか
          if (found) {
            currentFolder = finalSubFolders.next(); // C列のフォルダへ
          }
        }
      }

      // 最終的な結果を判定
      results.push([found ? currentFolder.getUrl() : 'フォルダなし']);
    } catch (e) {
      // 権限エラーやIDミスなど
      results.push(['エラー: 取得失敗']);
    }
  }

  // 4. M列（インデックス13）に出力
  // getRange(行, 列, 行数, 列数)
  listSheet.getRange(1, 13, results.length, 1).setValues(results);

  console.log(`M列へのURL出力が完了しました（全 ${results.length - 1} 件）。`);
};
/**
 * 6. 「フォルダ名編集済み一覧」からM列が「フォルダなし」の行と見出しを抽出し、
 * 別シートに出力する
 */
export const exportNotFoundFolders_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.FINAL);

  if (!sourceSheet) {
    throw new Error(
      `元シート「${CONFIG.SHEET_NAMES.FINAL}」が見つかりませんでした。`
    );
  }

  const data: string[][] = sourceSheet.getDataRange().getValues();
  if (data.length <= 1) return;

  // 1行目（見出し）を保持
  const header = data[0];

  // M列（インデックス12）が「フォルダなし」の行を抽出
  const notFoundRows = data.slice(1).filter(row => {
    return String(row[12]) === 'フォルダなし';
  });

  // 見出しと抽出結果を結合
  const resultData = [header, ...notFoundRows];

  // 出力先シートの準備
  let destSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.NOT_FOUND_LIST);
  if (destSheet) {
    destSheet.clear();
  } else {
    destSheet = ss.insertSheet(CONFIG.SHEET_NAMES.NOT_FOUND_LIST);
  }

  // データがある場合のみ出力
  if (resultData.length > 1) {
    destSheet
      .getRange(1, 1, resultData.length, resultData[0].length)
      .setValues(resultData);
    destSheet.getRange(1, 1, 1, resultData[0].length).setFontWeight('bold'); // 見出し太字
    console.log(
      `「フォルダなし」の行を ${notFoundRows.length} 件抽出しました。`
    );
  } else {
    console.log('「フォルダなし」の行は見つかりませんでした。');
  }
};
/**
 * 7. 「フォルダ不在確認リスト」のB列パスを辿り、
 * パスが完全に存在すればそのURLを、存在しなければ「フォルダなし」をN列に出力する
 */
export const fetchPartialFolderUrl_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const listSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.NOT_FOUND_LIST);

  if (!listSheet) {
    throw new Error(
      `シート「${CONFIG.SHEET_NAMES.NOT_FOUND_LIST}」が見つかりません。`
    );
  }

  const rootFolderId = PropertiesService.getScriptProperties().getProperty(
    CONFIG.PROPERTY_KEYS.SOURCE_DRIVE_FOLDER_ID
  );
  if (!rootFolderId) {
    throw new Error(
      `プロパティ ${CONFIG.PROPERTY_KEYS.SOURCE_DRIVE_FOLDER_ID} が未設定です。`
    );
  }

  const lastRow = listSheet.getLastRow();
  if (lastRow <= 1) return;

  // B列(2列目)のパスデータを取得
  const bColumnValues = listSheet.getRange(1, 2, lastRow, 1).getValues();
  const results: string[][] = [['確認済みフォルダURL']]; // N1の見出し

  for (let i = 1; i < bColumnValues.length; i++) {
    const fullPath = String(bColumnValues[i][0]).trim();
    if (!fullPath) {
      results.push(['']);
      continue;
    }

    const pathParts = fullPath.split('/').filter(part => part.length > 0);

    try {
      let currentFolder = DriveApp.getFolderById(rootFolderId);
      let isPathFullyFound = true; // パスが最後まで見つかったかのフラグ

      // 階層を1つずつ辿る
      for (const part of pathParts) {
        const subFolders = currentFolder.getFoldersByName(part);
        if (subFolders.hasNext()) {
          currentFolder = subFolders.next();
        } else {
          // 途中でフォルダが見つからなかった場合
          isPathFullyFound = false;
          break;
        }
      }

      // 最後まで辿り着けた場合のみURLを返し、そうでなければ「フォルダなし」
      const finalResult = isPathFullyFound
        ? currentFolder.getUrl()
        : 'フォルダなし';
      results.push([finalResult]);
    } catch (e) {
      results.push(['エラー: 取得失敗']);
    }
  }

  // N列（14列目）に出力
  listSheet.getRange(1, 14, results.length, 1).setValues(results);
  console.log(`N列にパスの確認結果を出力しました。`);
};
/**
 * 8. 「フォルダ不在確認リスト」のN列がURLの場合、そのフォルダ配下に
 * C列の文字列を名前としたフォルダを作成する。
 * 同名フォルダが既に存在する場合は作成をスキップする。
 */
export const createMissingFoldersFromList_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const listSheet = ss.getSheetByName(CONFIG.SHEET_NAMES.NOT_FOUND_LIST);

  if (!listSheet) {
    throw new Error(
      `シート「${CONFIG.SHEET_NAMES.NOT_FOUND_LIST}」が見つかりません。`
    );
  }

  const lastRow = listSheet.getLastRow();
  if (lastRow <= 1) return;

  // C列(3列目:フォルダ名)とN列(14列目:URL)のデータを取得
  // 範囲: 2行目から最終行まで、C列からN列まで（3列目から14列目なので計12列分）
  const range = listSheet.getRange(2, 1, lastRow - 1, 14);
  const values: string[][] = range.getValues();
  // テストのため、処理件数を制限する場合は以下の行を有効化
  //const values: string[][] = range.getValues().slice(0, 3); // 最初の3行のみ処理
  values.forEach((row, index) => {
    const folderName = String(row[2]).trim(); // C列
    const folderUrl = String(row[13]).trim(); // N列
    const rowIndex = index + 2; // スプレッドシート上の行番号

    // N列がURL（httpから始まる）かつ C列が空でない場合のみ実行
    if (folderUrl.startsWith('http') && folderName) {
      try {
        // URLからフォルダIDを抽出して取得
        // URL形式: https://drive.google.com/drive/folders/ID...
        const folderId = folderUrl.split('/folders/')[1].split('?')[0];
        const parentFolder = DriveApp.getFolderById(folderId);

        // 同名フォルダの存在確認
        const existingFolders = parentFolder.getFoldersByName(folderName);
        if (existingFolders.hasNext()) {
          console.warn(
            `[行:${rowIndex}] ワーニング: フォルダ「${folderName}」は既に存在するため作成をスキップしました。`
          );
          return;
        }

        // フォルダ作成
        parentFolder.createFolder(folderName);
        console.log(
          `[行:${rowIndex}] 成功: フォルダ「${folderName}」を作成しました。`
        );
      } catch (e: unknown) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        console.error(
          `[行:${rowIndex}] エラー: フォルダ作成に失敗しました (${folderName})。内容: ${errorMsg}`
        );
      }
    }
  });
};
