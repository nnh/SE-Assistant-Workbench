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
import * as Const from './const';
import { getFolderById_, DateUtils } from './utils';

/**
 * 共有設定を保持する基底クラス
 */
export abstract class BaseReport {
  // protected で定義すれば継承先でも this. でアクセス可能
  protected readonly PROP_OUTPUT_SS_ID =
    Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID;
  protected readonly PROP_JSON_FOLDER = Const.PROPERTY_KEYS.JSON_FOLDER_ID;

  protected jsonFolder: GoogleAppsScript.Drive.Folder;
  protected outputSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

  constructor() {
    const props = PropertiesService.getScriptProperties();

    // JSONフォルダの取得
    const jsonFolderId =
      props.getProperty(Const.PROPERTY_KEYS.JSON_FOLDER_ID) || '';
    this.jsonFolder = getFolderById_(jsonFolderId);

    // 出力スプレッドシートの取得
    const outputSsId =
      props.getProperty(Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID) || '';
    if (!outputSsId || outputSsId.includes('SET_YOUR_')) {
      throw new Error('出力先スプレッドシートIDが正しく設定されていません。');
    }
    this.outputSpreadsheet = this.getOutputSpreadsheet(outputSsId);
  }
  /**
   * JSONファイルを読み込み、指定した型にパースして返す
   * <T> は呼び出し時に決定される任意の型
   */
  protected loadJsonFile<T>(file: GoogleAppsScript.Drive.File): T | null {
    try {
      const content = file.getBlob().getDataAsString();
      // 期待される型 T としてパース
      const data: T = JSON.parse(content);
      return data;
    } catch (e) {
      console.error(
        `Failed to load or parse JSON from file ${file.getName()}: ${e}`
      );
      return null; // エラー時は null を返すのが一般的です
    }
  }
  /**
   * 特定の接頭辞を持つJSONファイル一覧を取得する共通処理
   * @param prefix Const.OUTPUT_FILE_NAME.PREFIX などの接頭辞
   * @param targetDriveName 処理対象の共有ドライブ名
   * @returns 該当するファイルの配列
   */
  protected getTargetJsonFiles(
    prefix: string,
    targetDriveName: string
  ): GoogleAppsScript.Drive.File[] {
    const files = this.jsonFolder.getFiles();
    const targetFiles: GoogleAppsScript.Drive.File[] = [];

    // 検索条件の構築 (例: フォルダ構成_ドライブ名_20260514)
    const searchPrefix = `${prefix}_${targetDriveName}_${DateUtils.getTodayStr()}`;

    while (files.hasNext()) {
      const file = files.next();
      const name = file.getName();

      if (name.startsWith(searchPrefix) && name.endsWith('.json')) {
        targetFiles.push(file);
      }
    }

    if (targetFiles.length === 0) {
      throw new Error(
        `指定された条件に合致するJSONファイルが見つかりませんでした: ${searchPrefix}`
      );
    }

    // バッチ番号順（p001, p002...）に処理できるよう、ファイル名でソートしておくと安全です
    return targetFiles.sort((a, b) => a.getName().localeCompare(b.getName()));
  }
  /**
   * 分割された複数のJSONファイルを読み込み、1つの配列に統合して返す
   * @param prefix ファイル名の接頭辞
   * @param targetDriveName 共有ドライブ名
   * @returns 統合されたデータの配列
   */
  protected fetchAndCombineJsonData<T>(
    prefix: string,
    targetDriveName: string
  ): T[] {
    // 1. 対象のファイル一覧を取得
    const targetFiles = this.getTargetJsonFiles(prefix, targetDriveName);

    let combinedData: T[] = [];

    // 2. 各ファイルを読み込んで配列にマージ
    for (const file of targetFiles) {
      const data = this.loadJsonFile<T[]>(file);
      if (data && Array.isArray(data)) {
        combinedData = combinedData.concat(data);
      } else {
        console.warn(
          `ファイル ${file.getName()} は空、または配列形式ではないためスキップしました。`
        );
      }
    }

    if (combinedData.length === 0) {
      console.warn(
        `ドライブ [${targetDriveName}] の有効なデータは見つかりませんでした。`
      );
    }

    return combinedData;
  }
  /**
   * 分割されたJSONファイルを統合し、スプレッドシート書き込み用の2次元配列に変換する
   * @param prefix ファイル名の接頭辞
   * @param targetDriveName 共有ドライブ名
   * @param rowMapper 各アイテムを string[] に変換するロジック
   */
  protected getOutputDataFromJsons<T>(
    prefix: string,
    targetDriveName: string,
    rowMapper: (item: T) => string[]
  ): string[][] {
    const allItems = this.fetchAndCombineJsonData<T>(prefix, targetDriveName);
    // rowMapper を使って 2次元配列に変換
    return allItems.map(item => rowMapper(item));
  }
  /**
   * 出力用スプレッドシートの取得
   * @param outputSsId
   * @returns
   */
  protected getOutputSpreadsheet(
    outputSsId: string
  ): GoogleAppsScript.Spreadsheet.Spreadsheet {
    const ss = SpreadsheetApp.openById(outputSsId);
    if (!ss) {
      throw new Error(
        `プロパティ「${this.PROP_OUTPUT_SS_ID}」に設定されたスプレッドシートIDが無効です。`
      );
    }
    return ss;
  }
  /**
   * 出力用シートの取得（存在しない場合は作成）
   * @param ss
   * @param sheetName
   * @param headers
   * @returns
   */
  protected getOutputSheet(
    ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
    sheetName: string,
    headers: string[]
  ): GoogleAppsScript.Spreadsheet.Sheet {
    let sheet = ss.getSheetByName(sheetName);
    if (sheet) {
      sheet.clear(); // 既存の内容をクリア
    } else {
      sheet = ss.insertSheet(sheetName);
    }
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers])
      .setBackground('#d9ead3')
      .setFontWeight('bold');
    sheet.setFrozenRows(1);
    return sheet;
  }
  protected addDataToSheet(
    data: string[][],
    sheet: GoogleAppsScript.Spreadsheet.Sheet
  ): void {
    if (data.length === 0) {
      console.warn('追加するデータがありません。');
      return;
    }
    // ヘッダーはすでに存在する前提なので、データは2行目以降に追加する
    const targetRange = sheet.getRange(
      sheet.getLastRow() + 1,
      1,
      data.length,
      data[0].length
    );
    // すべての列を文字列形式で設定
    targetRange.setNumberFormat('@');
    targetRange.setValues(data);
    sheet.autoResizeColumns(1, data[0].length);
  }
}
