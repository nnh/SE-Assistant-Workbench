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

// 結合列（メール/ロール…）の0始まりインデックス（HEADER の並びに対応）
const COMBINED_COLUMN_INDEX = 4;

// 「親から継承」の権限行に付ける薄い文字色
const INHERITED_TEXT_COLOR = '#999999';

// formatRows_ の戻り値。values はシート全体、richTexts は結合列のデータ行ごと
export interface FormattedOutput {
  values: (string | boolean)[][];
  richColumnIndex: number;
  richTexts: GoogleAppsScript.Spreadsheet.RichTextValue[];
}

// 権限1件分の「メール : ロール（フラグ）」文字列を作る
function combinedLine_(row: RawRow): string {
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
}

// 生データに日本語ラベル変換・補完・備考の付与を行い、シート出力用のデータを作る。
// 同一ファイル(ID)の複数権限は1行にまとめ、結合列はセル内改行で結合する。
// 「親から継承」の行はリッチテキストで文字色を薄くする
export function formatRows_(
  rawRows: RawRow[],
  notesByFileId: {[fileId: string]: string} = {},
): FormattedOutput {
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

  const grayStyle = SpreadsheetApp.newTextStyle()
    .setForegroundColor(INHERITED_TEXT_COLOR)
    .build();

  const values: (string | boolean)[][] = [HEADER];
  const richTexts: GoogleAppsScript.Spreadsheet.RichTextValue[] = [];
  for (const group of groups) {
    // ファイル単位の値（全権限で共通）は先頭行から取る
    const first = group[0];
    // パス列は末尾のファイル名/フォルダ名（C列と重複）を除いた親パスにする
    const nameSuffix = '/' + first.name;
    const parentPath = first.path.endsWith(nameSuffix)
      ? first.path.slice(0, -nameSuffix.length)
      : first.path;

    // 結合列：権限ごとに1行（セル内改行）。継承行は文字位置を控えて後で薄くする
    const lines: string[] = [];
    const dimRanges: {start: number; end: number}[] = [];
    let offset = 0;
    for (const row of group) {
      const line = combinedLine_(row);
      if (row.inherited) {
        dimRanges.push({start: offset, end: offset + line.length});
      }
      lines.push(line);
      offset += line.length + 1; // +1 は改行ぶん
    }
    const combinedText = lines.join('\n');
    let richBuilder = SpreadsheetApp.newRichTextValue().setText(combinedText);
    for (const range of dimRanges) {
      richBuilder = richBuilder.setTextStyle(range.start, range.end, grayStyle);
    }
    richTexts.push(richBuilder.build());

    values.push([
      parentPath,
      first.fileId,
      first.name,
      first.mimeType ? toMimeTypeLabel_(first.mimeType) : '',
      combinedText,
      notesByFileId[first.fileId] ?? '',
      first.fetchedAt,
    ]);
  }
  return {values, richColumnIndex: COMBINED_COLUMN_INDEX, richTexts};
}
