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

import {
  FILE_FIELDS,
  PERMISSION_LIST_FIELDS,
  HEADER,
  MIME_TYPE_LABELS,
  PERMISSION_TYPE_LABELS,
  ROLE_LABELS,
  DISPLAY_NAME_TO_EMAIL,
} from './constants';

interface DrivePermissionDetail {
  role?: string;
  inherited?: boolean;
}

interface DrivePermission {
  displayName?: string;
  type?: string;
  emailAddress?: string;
  allowFileDiscovery?: boolean;
  domain?: string;
  deleted?: boolean;
  view?: string;
  permissionDetails?: DrivePermissionDetail[];
}

interface DriveFile {
  id?: string;
  name?: string;
  mimeType?: string;
  parents?: string[];
}

interface DriveFileList {
  files?: DriveFile[];
  nextPageToken?: string;
}

interface DrivePermissionList {
  permissions?: DrivePermission[];
  nextPageToken?: string;
}

// appsscript.json で有効化した Drive 詳細サービス（v3）のグローバルを
// 必要なフィールドだけに絞った型で参照する
interface DriveAdvancedService {
  Files: {list(options: {[key: string]: unknown}): DriveFileList};
  Drives: {
    get(driveId: string, options: {[key: string]: unknown}): {name?: string};
  };
  Permissions: {
    list(
      fileId: string,
      options: {[key: string]: unknown},
    ): DrivePermissionList;
  };
}
const driveApi = (globalThis as unknown as {Drive: DriveAdvancedService}).Drive;

// mimeType を日本語ラベルに変換する。対応表にないものはそのまま返す
function toMimeTypeLabel_(mimeType: string): string {
  return MIME_TYPE_LABELS[mimeType] ?? mimeType;
}

// type（付与先種別）を日本語ラベルに変換する
function toTypeLabel_(type?: string): string {
  if (!type) {
    return '';
  }
  return PERMISSION_TYPE_LABELS[type] ?? type;
}

// role（ロール）を日本語ラベルに変換する
function toRoleLabel_(role?: string): string {
  if (!role) {
    return '';
  }
  return ROLE_LABELS[role] ?? role;
}

// inherited（継承かどうか）を日本語に変換する。未設定は空文字
function toInheritedLabel_(inherited?: boolean): string {
  if (inherited === undefined) {
    return '';
  }
  return inherited ? '継承' : '直接';
}

// allowFileDiscovery（検索で見つかるか）を日本語に変換する。未設定は空文字
function toAllowFileDiscoveryLabel_(allowFileDiscovery?: boolean): string {
  if (allowFileDiscovery === undefined) {
    return '';
  }
  return allowFileDiscovery ? '検索可' : '検索不可';
}

// deleted（アカウント削除済みか）を変換する。削除済みのときだけ値を出す
function toDeletedLabel_(deleted?: boolean): string {
  return deleted ? '削除済み' : '';
}

// 共有ドライブ名を取得する
export function getDriveName_(driveId: string): string {
  return driveApi.Drives.get(driveId, {fields: 'name'}).name ?? driveId;
}

// 共有ドライブ内の全ファイル・フォルダをページングで取得する。
// maxFiles を指定するとその件数で打ち切る（テスト用）
export function fetchAllFiles_(
  driveId: string,
  maxFiles?: number,
): DriveFile[] {
  const files: DriveFile[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const res: DriveFileList = driveApi.Files.list({
      corpora: 'drive',
      driveId: driveId,
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      pageSize: maxFiles ? Math.min(maxFiles, 1000) : 1000,
      fields: FILE_FIELDS,
      pageToken: pageToken,
    });
    if (res.files) {
      for (const file of res.files) {
        files.push(file);
      }
    }
    pageToken = res.nextPageToken;
    if (maxFiles && files.length >= maxFiles) {
      break;
    }
  } while (pageToken);
  return maxFiles ? files.slice(0, maxFiles) : files;
}

// 1ファイルの権限を permissions.list でページングして取得する
export function fetchPermissions_(fileId: string): DrivePermission[] {
  const permissions: DrivePermission[] = [];
  let pageToken: string | undefined = undefined;
  do {
    const res: DrivePermissionList = driveApi.Permissions.list(fileId, {
      supportsAllDrives: true,
      pageSize: 100,
      fields: PERMISSION_LIST_FIELDS,
      pageToken: pageToken,
    });
    if (res.permissions) {
      for (const permission of res.permissions) {
        permissions.push(permission);
      }
    }
    pageToken = res.nextPageToken;
  } while (pageToken);
  return permissions;
}

// ファイルのフルパスを解決する関数を返す。フォルダのパスはキャッシュする
function createPathResolver_(
  files: DriveFile[],
  driveId: string,
  driveName: string,
): (file: DriveFile) => string {
  const byId = new Map<string, DriveFile>();
  for (const file of files) {
    if (file.id) {
      byId.set(file.id, file);
    }
  }
  const folderPathCache = new Map<string, string>();

  function resolveFolderPath(folderId: string): string {
    // 共有ドライブのルートに到達したらドライブ名を返す
    if (folderId === driveId) {
      return driveName;
    }
    const cached = folderPathCache.get(folderId);
    if (cached !== undefined) {
      return cached;
    }
    const folder = byId.get(folderId);
    // 取得範囲外の親（通常は発生しない）はIDをそのまま使う
    if (!folder || !folder.name) {
      return folderId;
    }
    const parentId =
      folder.parents && folder.parents.length ? folder.parents[0] : driveId;
    const path = resolveFolderPath(parentId) + '/' + folder.name;
    folderPathCache.set(folderId, path);
    return path;
  }

  return (file: DriveFile): string => {
    const parentId =
      file.parents && file.parents.length ? file.parents[0] : driveId;
    return resolveFolderPath(parentId) + '/' + (file.name ?? '');
  };
}

// 出力用の2次元配列を作る（1ファイルの各権限明細ごとに1行）
export function buildRows_(
  files: DriveFile[],
  driveId: string,
  driveName: string,
): (string | boolean)[][] {
  const resolvePath = createPathResolver_(files, driveId, driveName);
  const rows: (string | boolean)[][] = [HEADER];
  for (const file of files) {
    const path = resolvePath(file);
    const permissions = file.id ? fetchPermissions_(file.id) : [];
    for (const permission of permissions) {
      // permissionDetails が空でも1行は出力する
      const details =
        permission.permissionDetails && permission.permissionDetails.length
          ? permission.permissionDetails
          : [{} as DrivePermissionDetail];
      const displayName = permission.displayName ?? '';
      const typeLabel = toTypeLabel_(permission.type);
      // メールアドレス(G列)が空のときの補完
      let emailAddress = permission.emailAddress ?? '';
      if (!emailAddress) {
        if (displayName === DISPLAY_NAME_TO_EMAIL) {
          // 表示名が指定組織なら表示名を入れる
          emailAddress = displayName;
        } else if (permission.type === 'anyone') {
          // 「リンクを知っている全員」なら付与先種別(F列)の値を入れる
          emailAddress = typeLabel;
        }
      }
      for (const detail of details) {
        rows.push([
          path,
          file.id ?? '',
          file.name ?? '',
          file.mimeType ? toMimeTypeLabel_(file.mimeType) : '',
          displayName,
          typeLabel,
          emailAddress,
          permission.domain ?? '',
          toRoleLabel_(detail.role),
          toInheritedLabel_(detail.inherited),
          toAllowFileDiscoveryLabel_(permission.allowFileDiscovery),
          toDeletedLabel_(permission.deleted),
          permission.view ?? '',
        ]);
      }
    }
  }
  return rows;
}

// 結果をバインド先スプレッドシートの指定シートへ書き込む（既存内容はクリア）
export function writeToSheet_(
  rows: (string | boolean)[][],
  sheetName: string,
): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  } else {
    sheet.clearContents();
  }
  // 行数が多くなるため分割して書き込む
  const width = HEADER.length;
  const chunkSize = 5000;
  let startRow = 1;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    sheet.getRange(startRow, 1, chunk.length, width).setValues(chunk);
    startRow += chunk.length;
  }
}
