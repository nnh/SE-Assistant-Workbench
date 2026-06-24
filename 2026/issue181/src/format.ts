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
  HEADER,
  MIME_TYPE_LABELS,
  PERMISSION_TYPE_LABELS,
  ROLE_LABELS,
  VIEW_LABELS,
  DISPLAY_NAME_TO_EMAIL,
} from './constants';
import {RawRow} from './functions';

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

// inherited（継承かどうか）を日本語に変換する
function toInheritedLabel_(inherited?: boolean): string {
  if (inherited === undefined) {
    return '';
  }
  return inherited ? '親から継承' : '';
}

// allowFileDiscovery（検索で見つかるか）を日本語に変換する。見つかる場合のみ値を出す
function toAllowFileDiscoveryLabel_(allowFileDiscovery?: boolean): string {
  return allowFileDiscovery ? '検索可' : '';
}

// deleted（アカウント削除済みか）を変換する。削除済みのときだけ値を出す
function toDeletedLabel_(deleted?: boolean): string {
  return deleted ? '削除済み' : '';
}

// view（ビュー）を日本語ラベルに変換する。未設定は空文字
function toViewLabel_(view?: string): string {
  if (!view) {
    return '';
  }
  return VIEW_LABELS[view] ?? view;
}

// メールアドレス(G列)が空のときの補完値を返す
function resolveEmail_(row: RawRow): string {
  if (row.emailAddress) {
    return row.emailAddress;
  }
  // 表示名が指定組織なら表示名を入れる
  if (row.displayName === DISPLAY_NAME_TO_EMAIL) {
    return row.displayName;
  }
  // 「リンクを知っている全員」なら付与先種別(F列)の値を入れる
  if (row.type === 'anyone') {
    return toTypeLabel_(row.type);
  }
  return '';
}

// 生データに日本語ラベル変換・補完・備考の付与を行い、シート出力用の2次元配列にする。
// 同一ファイル(ID)の複数権限は1行にまとめ、権限ごとの列はセル内改行で結合する
export function formatRows_(
  rawRows: RawRow[],
  notesByFileId: {[fileId: string]: string} = {},
): (string | boolean)[][] {
  // fileId ごとに行をまとめる（元の出現順を保持）
  const groups: RawRow[][] = [];
  const indexByFileId: {[fileId: string]: number} = {};
  for (const row of rawRows) {
    let index = indexByFileId[row.fileId];
    if (index === undefined) {
      index = groups.length;
      indexByFileId[row.fileId] = index;
      groups.push([]);
    }
    groups[index].push(row);
  }

  const rows: (string | boolean)[][] = [HEADER];
  for (const group of groups) {
    // ファイル単位の値（全権限で共通）は先頭行から取る
    const first = group[0];
    // パス列は末尾のファイル名/フォルダ名（C列と重複）を除いた親パスにする
    const nameSuffix = '/' + first.name;
    const parentPath = first.path.endsWith(nameSuffix)
      ? first.path.slice(0, -nameSuffix.length)
      : first.path;
    // 権限ごとに変わる列は改行で結合する（各行が1要素＝列をまたいで行が揃う）
    const join = (toCell: (row: RawRow) => string): string =>
      group.map(toCell).join('\n');
    rows.push([
      parentPath,
      first.fileId,
      first.name,
      first.mimeType ? toMimeTypeLabel_(first.mimeType) : '',
      // 権限ごとに「メール : ロール（フラグ）」の形でまとめる。
      // 継承・検索は値があるときだけ括弧で添える
      join(row => {
        const head = [resolveEmail_(row), toRoleLabel_(row.role)]
          .filter(value => value)
          .join(' : ');
        const flags = [
          toInheritedLabel_(row.inherited),
          toAllowFileDiscoveryLabel_(row.allowFileDiscovery),
          toDeletedLabel_(row.deleted),
          toViewLabel_(row.view),
        ].filter(value => value);
        return flags.length ? `${head}（${flags.join('・')}）` : head;
      }),
      notesByFileId[first.fileId] ?? '',
      first.fetchedAt,
    ]);
  }
  return rows;
}
