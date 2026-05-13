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
export function executeExport_(
  folderId: string,
  baseSheetName: string,
  maxDepth: number
) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const today = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');
  const targetSheetName = `${baseSheetName}_${today}`;

  let sheet = ss.getSheetByName(targetSheetName);

  // 既存シートがあればクリア、なければ作成
  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(targetSheetName);
  }

  // ヘッダー行の作成
  const header = [
    'フォルダ名',
    'フォルダID',
    '階層',
    'ユーザー名',
    'メールアドレス',
    '権限',
    'タイプ',
  ];
  sheet.appendRow(header);
  sheet
    .getRange(1, 1, 1, header.length)
    .setFontWeight('bold')
    .setBackground('#f3f3f3');

  const results: string[][] = [];
  try {
    const rootFolder = DriveApp.getFolderById(folderId);
    getPermissionsRecursive_(rootFolder, 0, maxDepth, results, '');

    if (results.length > 0) {
      sheet
        .getRange(2, 1, results.length, results[0].length)
        .setValues(results);
    }
    console.log(`処理完了: ${targetSheetName}`);
  } catch (e) {
    if (e instanceof Error) {
      console.error(`エラー（ID: ${folderId}）: ${e.message}`);
    } else {
      console.error(`エラー（ID: ${folderId}）: ${String(e)}`);
    }
  }
}

/**
 * 共有ドライブの権限ロールを日本語に変換
 */
function getRoleName_(role: string): string {
  const roles: Record<string, string> = {
    organizer: '管理者',
    fileOrganizer: 'コンテンツ管理者',
    writer: '投稿者',
    commenter: '閲覧者（コメント可）',
    reader: '閲覧者',
  };
  return roles[role] || role;
}

/**
 * 再帰的にフォルダ情報を取得
 * @param folder 対象フォルダ
 * @param currentDepth 現在の階層
 * @param maxDepth 最大階層
 * @param results 結果格納用配列
 * @param currentPath 親から引き継いだパス文字列
 */
function getPermissionsRecursive_(
  folder: GoogleAppsScript.Drive.Folder,
  currentDepth: number,
  maxDepth: number,
  results: (string | number)[][],
  currentPath = '' // パスを保持する引数を追加
): void {
  const folderName = folder.getName();
  const folderId = folder.getId();

  // 現在のフォルダのパスを組み立てる（親パスがあれば / でつなぐ）
  const fullPath = currentPath ? `${currentPath}/${folderName}` : folderName;

  try {
    if (typeof Drive === 'undefined') {
      throw new Error('Drive API サービスが有効化されていません。');
    }

    const permissions = Drive.Permissions?.list(folderId, {
      supportsAllDrives: true, // 共有ドライブ対応
    }) as any;

    if (permissions && Array.isArray(permissions.items)) {
      permissions.items.forEach((perm: any) => {
        const name = perm.name || '不明なユーザー';
        const email = perm.emailAddress || '---';
        const role = getRoleName_(perm.role || '');
        const type = perm.type || '';

        results.push([
          fullPath, // A列: フォルダ名 を フルパス に変更
          folderId,
          currentDepth,
          name,
          email,
          role,
          type,
        ]);
      });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(`権限取得エラー（ID: ${folderId}）: ${message}`);
  }

  // サブフォルダ探索
  if (currentDepth < maxDepth) {
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      getPermissionsRecursive_(
        subFolders.next(),
        currentDepth + 1,
        maxDepth,
        results,
        fullPath // 次の階層に現在のパスを渡す
      );
    }
  }
}
