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
import {extractAroExternalShareRows_} from './aro-external-share-extractor';
import {writeAroExternalShareResult_} from './aro-external-share-writer';
import {extractMissingRows_} from './diff-extractor';
import {writeDiffResult_} from './diff-writer';
import {collectSpreadsheetsInFolder_} from './folder-scanner';
import {fillBlankPaths_} from './path-lookup-blank-resolver';
import {writePathLookupResult_} from './path-lookup-writer';
import {resolvePathsForDiffResult_} from './path-lookup';
import {
  getAroSpreadsheetId_,
  getFolderId_,
  initializeProperties_,
} from './properties';
import {
  extractShareRows_,
  ShareExtractResult,
} from './share-permission-extractor';
import {writeShareExtractResult_} from './share-permission-writer';
import {writeSpreadsheetList_} from './sheet-writer';
import {readTargetSpreadsheetIds_} from './target-list-reader';

/**
 * 指定フォルダ配下（サブフォルダ含む）の全スプレッドシートのファイル名・ID・URLを
 * シートに出力する。GASエディタから手動実行、またはトリガーに設定する。
 */
function outputSpreadsheetList(): void {
  initializeProperties_();
  const folderId = getFolderId_();
  const spreadsheetInfos = collectSpreadsheetsInFolder_(folderId);
  writeSpreadsheetList_(spreadsheetInfos);
}

/**
 * 「抽出対象シート」に列挙されたスプレッドシートを開き、各「共有権限」シートの
 * うちF列がPRIVATEでない行を抽出結果シートにまとめて出力する。
 * 「共有権限」シートが存在しないスプレッドシートはスキップする。
 */
function extractSharePermissions(): void {
  const spreadsheetIds = readTargetSpreadsheetIds_();

  let header: ShareExtractResult['header'] = null;
  const rows: unknown[][] = [];

  for (const spreadsheetId of spreadsheetIds) {
    const result = extractShareRows_(spreadsheetId);
    if (header === null) {
      header = result.header;
    }
    rows.push(...result.rows);
  }

  writeShareExtractResult_(header, rows);
}

/**
 * スクリプトプロパティで指定したスプレッドシートを開き、「ARO外部共有ファイル一覧」
 * シートのうちE列が「リンクを知っている全員」の行を抽出結果シートに出力する。
 * 見出し行は常に出力する。
 */
function extractAroExternalShareLinks(): void {
  initializeProperties_();
  const spreadsheetId = getAroSpreadsheetId_();
  const {header, rows} = extractAroExternalShareRows_(spreadsheetId);
  writeAroExternalShareResult_(header, rows);
}

/**
 * 「（移動前）共有権限抽出結果」シートのD列と「（移動後）外部共有リンクを知っている
 * 全員」シートのB列を比較し、前者にのみ存在する行を差分抽出結果シートに出力する。
 */
function extractSharePermissionDiff(): void {
  const {header, rows} = extractMissingRows_();
  writeDiffResult_(header, rows);
}

/**
 * 「差分抽出結果」シートの各行のID(D列)を、スクリプトプロパティで指定した
 * 「ARO外部共有ファイル一覧」シートのID(B列)と照合し、一致した場合はパス(A列)を
 * 付与してパス、ID、ファイル名、URLの形式で出力する。一致しない場合はパスを空白にする。
 */
function resolveDiffResultPaths(): void {
  initializeProperties_();
  const aroSpreadsheetId = getAroSpreadsheetId_();
  const {header, rows} = resolvePathsForDiffResult_(aroSpreadsheetId);
  writePathLookupResult_(header, rows);
}

/**
 * 「パス付き差分抽出結果」シートでパスが空白の行について、IDをもとにDriveAppで
 * 親フォルダを遡ってパスを取得し、シートに書き戻す。
 */
function resolveBlankPathsFromDrive(): void {
  fillBlankPaths_();
}
