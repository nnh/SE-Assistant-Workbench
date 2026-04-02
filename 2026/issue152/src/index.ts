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
import { listSpecificSheets_ } from './searchSpreadsheets';
import { appendSharedPermissions_ } from './appendSharedPermissions';
import { SHEET_NAME_TARGET_LIST } from './const';
import { extractSharedItems_ } from './extractSharedItems';
import { splitUsersByRole_ } from './splitUsersByRole';
import { execExtractExternalUsers_ } from './extractExternalUsers';
import { execAggregateEmailsById_ } from './aggregateEmailsById';
import { mergeExternalSummaries_ } from './mergeExternalSummaries';
import { mergeAllExternalUsers_ } from './mergeAllExternalUsers';
import { filterAndCleanExternalSharing_ } from './filterAndCleanExternalSharing';
import { execFetchSingleItemPermission_ } from './fetchSingleItemPermission';

/**
 * 2. 「対象のスプレッドシート一覧」シートに記載されたURLのスプレッドシートから「共有権限」シートのデータを取得し、
 * "共有権限一覧_アクセス種別再取得前"シートに追記します。
 */
function execAppendSharedPermissions_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME_TARGET_LIST);
  if (!sheet) {
    throw new Error(`シート "${SHEET_NAME_TARGET_LIST}" が見つかりません。`);
  }
  const data = sheet.getDataRange().getValues();
  // 1行目は見出しなのでスキップ
  for (let i = 1; i < data.length; i++) {
    const url = data[i][1]; // URLは2列目にあると仮定
    if (url) {
      appendSharedPermissions_(url);
    } else {
      console.warn(`URLが見つかりません: 行 ${i + 1}`);
    }
  }
}

function main() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let initSheet = ss.getSheetByName(SHEET_NAME_TARGET_LIST);

  // 1. initSheet の確保（存在しなければ作成、あれば中身をクリア）
  if (!initSheet) {
    initSheet = ss.insertSheet(SHEET_NAME_TARGET_LIST);
    console.log(`シート "${SHEET_NAME_TARGET_LIST}" を作成しました。`);
  } else {
    initSheet.clear();
  }

  // 2. 全てのシートを取得してループ処理
  const allSheets = ss.getSheets();
  allSheets.forEach(sheet => {
    // シート名が SHEET_NAME_TARGET_LIST 以外の場合のみ削除
    if (sheet.getName() !== SHEET_NAME_TARGET_LIST) {
      ss.deleteSheet(sheet);
    }
  });

  console.log(`"${SHEET_NAME_TARGET_LIST}" 以外の全シートを削除しました。`);
  /**
   * 1. 指定したフォルダ内の移動後スプレッドシートのファイル名とURLをリストアップして「対象スプレッドシート一覧」シートに出力します。
   */
  listSpecificSheets_();
  /**
   * 2. 「対象のスプレッドシート一覧」シートに記載されたURLのスプレッドシートから「共有権限」シートのデータを取得し、
   * "共有権限一覧_アクセス種別再取得前"シートに追記します。
   */
  execAppendSharedPermissions_();
  /**
   * 3. "共有権限一覧_アクセス種別再取得前"シートからアクセス種別が "!取得不可!" の行を特定し、
   * 対象IDの権限情報を再取得して「共有権限一覧」シートに出力します。
   */
  execFetchSingleItemPermission_();
  /**
   * 4. 「共有権限一覧」シートからアクセス種別が 'PRIVATE', 'DOMAIN', 'DOMAIN_WITH_LINK' 以外の行を抽出し、
   * "アクセス種別が取得不可またはANYONE_WITH_LINKのアイテム"シートに出力します。
   */
  extractSharedItems_();
  /**
   * 5. 共有権限一覧シートから、編集者と閲覧者をそれぞれ1人1行に分割して"編集者一覧"と"閲覧者一覧"シートに出力します。
   */
  splitUsersByRole_();
  /**
   * 6. "編集者一覧"と"閲覧者一覧"シートから、特定のドメイン以外のメールアドレスを持つ行を抽出し、
   * "ドメイン外の編集者"と"ドメイン外の閲覧者"シートに出力します。
   */
  execExtractExternalUsers_();
  /**
   * 7. "ドメイン外の編集者"と"ドメイン外の閲覧者"シートから、
   * ID(D列)ごとにメールアドレス(I列)をセル内改行で連結して
   * "ドメイン外の編集者_ファイル別集約"シートと"ドメイン外の閲覧者_ファイル別集約"シートに出力します。
   */
  execAggregateEmailsById_();
  /**
   * 8. "ドメイン外の編集者_ファイル別集約"シートと"ドメイン外の閲覧者_ファイル別集約"シートをID(D列)で結合し、
   * "ドメイン外の編集者・閲覧者"シートに出力します。
   */
  mergeExternalSummaries_();
  /**
   * 9. "アクセス種別が取得不可またはANYONE_WITH_LINKのアイテム"シートと"ドメイン外の編集者・閲覧者"ユーザーシートを結合し、
   * ID(D列)をキーに重複を排除・集約して最終一覧シートに出力します。
   */
  mergeAllExternalUsers_();
  /**
   * 10. 外部共有アイテム一覧シートを元に、以下のクレンジングを行い別シートに出力します。
   *  1. B列（パス）の先頭「ドライブ」を、L列（ファイル名）から整形した部署名に置換
   *  2. I列（編集者）とJ列（閲覧者）から内部ドメインのアドレスを削除
   *  3. 全列が完全に一致する行を1行にまとめる（重複排除）
   */
  filterAndCleanExternalSharing_();
}
console.log(hello());
