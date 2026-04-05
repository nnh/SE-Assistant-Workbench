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
import * as consts from './consts';

/**
 * 「共有権限」シートのデータを元に、用途別の各シート（基本情報、アクセス種別、編集者、閲覧者）へ分割・出力します。
 */
export const splitPermissionData_ = (): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName(consts.SHEET_NAME.PERMISSION);

  if (!sourceSheet) {
    console.error(
      `元となるシート「${consts.SHEET_NAME.PERMISSION}」が見つかりません。`
    );
    return;
  }

  const values: string[][] = sourceSheet.getDataRange().getValues();
  if (values.length <= 1) {
    console.warn('分割対象のデータが存在しません（ヘッダーのみです）。');
    return;
  }

  // ヘッダーを除いたデータ行を取得
  const dataRows: string[][] = values.slice(1);

  // --- 1. 基本情報 ---
  // A:タイプ[0], B:パス[1], C:名前[2], D:ID[3], E:URL[4], H:オーナー[7], K:ショートカット元ID[10]
  const basicInfo = dataRows.map(row => [
    row[0],
    row[1],
    row[2],
    row[3],
    row[4],
    row[7],
    row[10],
  ]);
  const basicHeader = [
    'タイプ',
    'パス',
    '名前',
    'ID',
    'URL',
    'オーナー',
    'ショートカット元ID',
  ];
  updateSubSheet_(ss, consts.SHEET_NAME.BASIC_INFO, basicHeader, basicInfo);

  // 除外したいアクセス種別の定義
  const excludedTypes = ['PRIVATE', 'DOMAIN', 'DOMAIN_WITH_LINK'];

  // --- 2. アクセス種別情報 ---
  // 1. まず filter で除外対象以外の行だけに絞り込む
  // 2. その後 map で必要な列（D:ID[3], F:アクセス種別[5], G:権限[6]）を抽出する
  const accessInfo = dataRows
    .filter(row => !excludedTypes.includes(String(row[5]))) // F列(index:5)が除外リストにない場合のみ
    .map(row => [row[3], row[5], row[6]]);

  const accessHeader = ['ID', 'アクセス種別', '権限'];
  updateSubSheet_(ss, consts.SHEET_NAME.ACCESS_INFO, accessHeader, accessInfo);

  // 除外対象のドメインリスト
  const excludedDomains = ['@nnh.go.jp', '@nagoya.hosp.go.jp'];

  /**
   * メールアドレスの配列をフィルタリングし、改行で再結合する内部関数
   */
  const filterAndJoinEmails = (rawText: string): string => {
    const rawValue = String(rawText || '').trim();
    if (!rawValue || rawValue === consts.LABEL.NO_GET) return '';

    const filtered = rawValue
      .split('\n')
      .map(e => e.trim())
      .filter(email => {
        if (!email) return false;
        // 除外ドメインに含まれないものだけ残す
        return !excludedDomains.some(domain =>
          email.toLowerCase().endsWith(domain.toLowerCase())
        );
      });

    return filtered.join('\n');
  };

  // --- 3. 編集者情報 (IDごとに外部ユーザーを再集約) ---
  const editorInfo = dataRows
    .map(row => {
      const id = row[3];
      const joinedEmails = filterAndJoinEmails(String(row[8]));
      return [id, joinedEmails];
    })
    .filter(row => row[1] !== ''); // 外部ユーザーが一人もいない行は除外

  const editorHeader = ['ID', '外部編集者リスト'];
  updateSubSheet_(ss, consts.SHEET_NAME.EDITOR_LIST, editorHeader, editorInfo);

  // --- 4. 閲覧者情報 (IDごとに外部ユーザーを再集約) ---
  const viewerInfo = dataRows
    .map(row => {
      const id = row[3];
      const joinedEmails = filterAndJoinEmails(String(row[9]));
      return [id, joinedEmails];
    })
    .filter(row => row[1] !== ''); // 外部ユーザーが一人もいない行は除外

  const viewerHeader = ['ID', '外部閲覧者リスト'];
  updateSubSheet_(ss, consts.SHEET_NAME.VIEWER_LIST, viewerHeader, viewerInfo);
  console.log('✅ データの分割出力が正常に完了しました。');
};

/**
 * サブシートを作成または取得し、内容を最新データで上書きします。
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - アクティブなスプレッドシートオブジェクト
 * @param {string} sheetName - 出力先のシート名
 * @param {string[]} header - 書き出すヘッダー行
 * @param {(string | number | boolean)[][]} data - 書き出すデータの2次元配列
 */
const updateSubSheet_ = (
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string,
  header: string[],
  data: (string | number | boolean)[][]
): void => {
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  // シートの内容を一度全てクリア（古いデータが残るのを防ぐ）
  sheet.clear();

  // ヘッダーの書き込み
  sheet.getRange(1, 1, 1, header.length).setValues([header]);

  // データの書き込み（データが存在する場合のみ）
  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, data[0].length).setValues(data);
  }

  // レイアウト調整（1行目固定、列幅自動調整などはお好みで）
  sheet.setFrozenRows(1);
  // sheet.autoResizeColumns(1, header.length); // 実行時間に余裕があれば有効化
};

/**
 * 共通のフィルタリングおよびパス加工処理
 * @param data - 加工元の2次元配列（1行目は見出し）
 * @param excludePaths - 除外したいパスの完全一致リスト（デフォルトは空配列）
 * @returns 加工済みのヘッダーとデータ行のセット
 */
const getProcessedBaseRows_ = (
  data: string[][],
  excludePaths: string[] = [] // デフォルト値を設定
): {
  header: string[];
  rows: string[][];
} => {
  if (data.length === 0) return { header: [], rows: [] };

  const header = data[0];
  const rows = data.slice(1);

  // 1. 対象外パスのフィルタリング（完全一致）
  const filteredRows = rows.filter(row => {
    const path = String(row[1] || ''); // B列: パス
    // excludePaths が空の場合は常に true (除外しない) になります
    return !excludePaths.some(excludePath => path === excludePath);
  });

  // 2. データの加工（パスの切り詰め）
  const processedRows = filteredRows.map(row => {
    const type = row[0]; // A列
    let path = String(row[1] || '');

    // フォルダの場合は親フォルダのパスにする（末尾の名称を切り詰める）
    if (type === 'フォルダ' && path.includes('/')) {
      const lastSlashIndex = path.lastIndexOf('/');
      path = path.substring(0, lastSlashIndex);
    }

    const newRow = [...row];
    newRow[1] = path;
    return newRow;
  });

  return { header, rows: processedRows };
};

/**
 * フォルダデータのみを抽出し、指定したシートに出力します。
 * @param data - 加工元の2次元配列
 * @param sheetName - フォルダデータの出力先シート名
 * @param excludePaths - 除外したいパスの完全一致リスト（デフォルトは空配列）
 */
export const outputFolderList_ = (
  data: string[][],
  sheetName: string,
  excludePaths: string[] = [] // デフォルト値を設定
): void => {
  const { header, rows } = getProcessedBaseRows_(data, excludePaths);
  const folderData = rows.filter(row => row[0] === 'フォルダ');

  saveToSheet_(sheetName, [header, ...folderData]);
  console.log(`✅ フォルダ一覧を「${sheetName}」に出力しました。`);
};

/**
 * ファイルデータのみを抽出し、指定したシートに出力します。
 * @param data - 加工元の2次元配列
 * @param sheetName - ファイルデータの出力先シート名
 * @param excludePaths - 除外したいパスの完全一致リスト（デフォルトは空配列）
 */
export const outputFileList_ = (
  data: string[][],
  sheetName: string,
  excludePaths: string[] = [] // デフォルト値を設定
): void => {
  const { header, rows } = getProcessedBaseRows_(data, excludePaths);
  const fileData = rows.filter(row => row[0] === 'ファイル');

  saveToSheet_(sheetName, [header, ...fileData]);
  console.log(`✅ ファイル一覧を「${sheetName}」に出力しました。`);
};

/**
 * 指定したシートにデータを保存する内部用関数
 * @param sheetName - 出力先シート名
 * @param fullData - ヘッダーを含む全データ
 */
const saveToSheet_ = (sheetName: string, fullData: string[][]): void => {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (sheet) {
    sheet.clear();
  } else {
    sheet = ss.insertSheet(sheetName);
  }

  // データがヘッダーのみ（中身が空）でないか確認
  if (fullData.length > 1) {
    sheet
      .getRange(1, 1, fullData.length, fullData[0].length)
      .setValues(fullData);
  } else if (fullData.length === 1) {
    // ヘッダーのみ書き込み
    sheet.getRange(1, 1, 1, fullData[0].length).setValues(fullData);
  }
};
