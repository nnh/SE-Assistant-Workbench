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
  CACHE_FILE_NAME,
  CACHE_FILE_ID_KEY,
  NOTES_SHEET_NAME,
  FETCH_BUDGET_MS,
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
  modifiedTime?: string;
}

// 権限キャッシュ：fileId ごとに更新日時・取得日時・権限一覧を保持する。
// fetchedAt は古いキャッシュには無いことがあるため任意
interface CacheEntry {
  modifiedTime: string;
  fetchedAt?: string;
  permissions: DrivePermission[];
}
type PermissionCache = {[fileId: string]: CacheEntry};
type PermissionsByFileId = {[fileId: string]: DrivePermission[]};
type FetchedAtByFileId = {[fileId: string]: string};

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

// 現在時刻をスクリプトのタイムゾーンで 'yyyy-MM-dd HH:mm:ss' に整形して返す
export function nowString_(): string {
  return Utilities.formatDate(
    new Date(),
    Session.getScriptTimeZone(),
    'yyyy-MM-dd HH:mm:ss',
  );
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
      q: 'trashed = false', // ゴミ箱内のファイルは除外する
      pageSize: maxFiles ? Math.min(maxFiles, 1000) : 1000,
      fields: FILE_FIELDS,
      pageToken: pageToken,
    });
    // ファイルが返らなければ終了（nextPageToken が返り続ける異常時の無限ループ防止）
    if (!res.files || res.files.length === 0) {
      break;
    }
    for (const file of res.files) {
      files.push(file);
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

// Drive に保存した権限キャッシュを読み込む。無い/壊れている場合は空（全件取得）
export function loadCache_(): PermissionCache {
  const fileId =
    PropertiesService.getScriptProperties().getProperty(CACHE_FILE_ID_KEY);
  if (!fileId) {
    return {};
  }
  try {
    const content = DriveApp.getFileById(fileId).getBlob().getDataAsString();
    return JSON.parse(content) as PermissionCache;
  } catch {
    // キャッシュファイルが削除された/壊れている場合は全件取得に倒す
    return {};
  }
}

// 権限キャッシュを Drive の JSON ファイルへ保存する（無ければ作成）
export function saveCache_(cache: PermissionCache): void {
  const json = JSON.stringify(cache);
  const properties = PropertiesService.getScriptProperties();
  const fileId = properties.getProperty(CACHE_FILE_ID_KEY);
  if (fileId) {
    DriveApp.getFileById(fileId).setContent(json);
    return;
  }
  const file = DriveApp.createFile(CACHE_FILE_NAME, json, 'application/json');
  properties.setProperty(CACHE_FILE_ID_KEY, file.getId());
}

// modifiedTime を使った差分取得（時間予算付き）。更新/新規ファイルだけ
// permissions.list を呼び、FETCH_BUDGET_MS を超えたら今回の取得は打ち切る。
// 打ち切ったファイルは次回以降の実行で取得する（段階的に完成させる）。
// fetched=今回取得した件数, remaining=今回取得しきれず次回に持ち越す件数
export function resolvePermissions_(
  files: DriveFile[],
  cache: PermissionCache,
): {
  permissionsByFileId: PermissionsByFileId;
  fetchedAtByFileId: FetchedAtByFileId;
  newCache: PermissionCache;
  fetched: number;
  remaining: number;
} {
  const permissionsByFileId: PermissionsByFileId = {};
  const fetchedAtByFileId: FetchedAtByFileId = {};
  const newCache: PermissionCache = {};
  const start = Date.now();
  let fetched = 0;
  let remaining = 0;
  for (const file of files) {
    if (!file.id) {
      continue;
    }
    const modifiedTime = file.modifiedTime ?? '';
    const cached = cache[file.id];
    if (cached && cached.modifiedTime === modifiedTime) {
      // 前回から未更新 → 再利用（API 呼び出しなし。取得日時も前回のまま）
      newCache[file.id] = cached;
      permissionsByFileId[file.id] = cached.permissions;
      fetchedAtByFileId[file.id] = cached.fetchedAt ?? '';
      continue;
    }
    if (Date.now() - start < FETCH_BUDGET_MS) {
      // 更新/新規 → 取り直し（取得日時を記録）
      const permissions = fetchPermissions_(file.id);
      const fetchedAt = nowString_();
      newCache[file.id] = {modifiedTime, fetchedAt, permissions};
      permissionsByFileId[file.id] = permissions;
      fetchedAtByFileId[file.id] = fetchedAt;
      fetched++;
    } else {
      // 時間切れ：今回は取得しない。古いキャッシュがあれば暫定で残す（次回再取得）
      if (cached) {
        newCache[file.id] = cached;
        permissionsByFileId[file.id] = cached.permissions;
        fetchedAtByFileId[file.id] = cached.fetchedAt ?? '';
      }
      remaining++;
    }
  }
  return {permissionsByFileId, fetchedAtByFileId, newCache, fetched, remaining};
}

// キャッシュ済みの権限・取得日時を、再取得せずに取り出す（formatPermissions 用）
export function permissionsFromCache_(
  files: DriveFile[],
  cache: PermissionCache,
): {
  permissionsByFileId: PermissionsByFileId;
  fetchedAtByFileId: FetchedAtByFileId;
} {
  const permissionsByFileId: PermissionsByFileId = {};
  const fetchedAtByFileId: FetchedAtByFileId = {};
  for (const file of files) {
    if (!file.id) {
      continue;
    }
    const cached = cache[file.id];
    if (cached) {
      permissionsByFileId[file.id] = cached.permissions;
      fetchedAtByFileId[file.id] = cached.fetchedAt ?? '';
    }
  }
  return {permissionsByFileId, fetchedAtByFileId};
}

// 1行分の生データ（ラベル変換・補完前）。HEADER の各列に対応する
export interface RawRow {
  path: string;
  fileId: string;
  name: string;
  mimeType: string;
  displayName: string;
  type: string;
  emailAddress: string;
  domain: string;
  role: string;
  inherited?: boolean;
  allowFileDiscovery?: boolean;
  deleted?: boolean;
  view: string;
  fetchedAt: string;
}

// 生データの行（1ファイルの各権限明細ごとに1行）を作る。ラベル変換はしない
export function buildRows_(
  files: DriveFile[],
  driveId: string,
  driveName: string,
  permissionsByFileId: PermissionsByFileId,
  fetchedAtByFileId: FetchedAtByFileId,
): RawRow[] {
  const resolvePath = createPathResolver_(files, driveId, driveName);
  const rows: RawRow[] = [];
  for (const file of files) {
    const path = resolvePath(file);
    const permissions = file.id ? (permissionsByFileId[file.id] ?? []) : [];
    const fetchedAt = file.id ? (fetchedAtByFileId[file.id] ?? '') : '';
    for (const permission of permissions) {
      // permissionDetails が空でも1行は出力する
      const details =
        permission.permissionDetails && permission.permissionDetails.length
          ? permission.permissionDetails
          : [{} as DrivePermissionDetail];
      for (const detail of details) {
        rows.push({
          path,
          fileId: file.id ?? '',
          name: file.name ?? '',
          mimeType: file.mimeType ?? '',
          displayName: permission.displayName ?? '',
          type: permission.type ?? '',
          emailAddress: permission.emailAddress ?? '',
          domain: permission.domain ?? '',
          role: detail.role ?? '',
          inherited: detail.inherited,
          allowFileDiscovery: permission.allowFileDiscovery,
          deleted: permission.deleted,
          view: permission.view ?? '',
          fetchedAt,
        });
      }
    }
  }
  // パス順に並べる（同一ファイルの行はパスが同じなので隣接したまま）
  rows.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  return rows;
}

// 備考シートを読み込み、ファイルID → 説明 のマップを返す。シートが無ければ空
export function readNotes_(): {[fileId: string]: string} {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(NOTES_SHEET_NAME);
  const notes: {[fileId: string]: string} = {};
  if (!sheet) {
    return notes;
  }
  const values = sheet.getDataRange().getValues();
  // 先頭行は見出しなのでスキップ。A列=ファイルID, C列=説明
  for (let i = 1; i < values.length; i++) {
    const fileId = String(values[i][0]);
    if (fileId) {
      notes[fileId] = String(values[i][2]);
    }
  }
  return notes;
}

// 指定列(0始まり)の2行目以降にリッチテキストを設定する（結合列の継承行を薄くする用）
export function setColumnRichText_(
  sheetName: string,
  columnIndex: number,
  richTexts: GoogleAppsScript.Spreadsheet.RichTextValue[],
): void {
  if (!richTexts.length) {
    return;
  }
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    return;
  }
  const cells = richTexts.map(richText => [richText]);
  const chunkSize = 5000;
  let startRow = 2; // 1行目は見出し
  for (let i = 0; i < cells.length; i += chunkSize) {
    const chunk = cells.slice(i, i + chunkSize);
    sheet
      .getRange(startRow, columnIndex + 1, chunk.length, 1)
      .setRichTextValues(chunk);
    startRow += chunk.length;
  }
}

// 指定シートが存在すれば削除する（旧 permissions_raw の掃除用）
export function deleteSheetIfExists_(sheetName: string): void {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (sheet) {
    ss.deleteSheet(sheet);
  }
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
  if (!rows.length) {
    return;
  }
  const width = rows[0].length;
  // 既定サイズ（新規シートは1000行）を超える場合に備え、先に行数・列数を確保する。
  // 不足したまま setValues すると「範囲外」エラーになる
  const maxRows = sheet.getMaxRows();
  if (maxRows < rows.length) {
    sheet.insertRowsAfter(maxRows, rows.length - maxRows);
  }
  const maxColumns = sheet.getMaxColumns();
  if (maxColumns < width) {
    sheet.insertColumnsAfter(maxColumns, width - maxColumns);
  }
  // 行数が多くなるため分割して書き込む
  const chunkSize = 5000;
  let startRow = 1;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    sheet.getRange(startRow, 1, chunk.length, width).setValues(chunk);
    startRow += chunk.length;
  }
}
