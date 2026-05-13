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
/**
 * FolderReportGenerator.ts
 * 保存されたJSONファイルを読み込み、指定フォルダ内の日付入りスプレッドシートに出力する。
 */

export class FolderReportGenerator {
  private readonly PROP_JSON_FOLDER = 'SAVE_DESTINATION_FOLDER_ID';
  private readonly PROP_OUTPUT_FOLDER = 'REPORT_OUTPUT_FOLDER_ID';

  private jsonFolderId: string;
  private outputFolderId: string;

  constructor() {
    const props = PropertiesService.getScriptProperties();
    // JSONが保存されているフォルダID
    this.jsonFolderId = props.getProperty(this.PROP_JSON_FOLDER) || '';
    // スプレッドシートを保存するフォルダID（なければダミー作成）
    this.outputFolderId = this.getOrSetDefault(
      props,
      this.PROP_OUTPUT_FOLDER,
      'SET_YOUR_OUTPUT_FOLDER_ID_HERE'
    );
  }

  /**
   * プロパティを取得。存在しない場合はダミー値を作成して保存する。
   */
  private getOrSetDefault(
    props: GoogleAppsScript.Properties.Properties,
    key: string,
    defaultValue: string
  ): string {
    const val = props.getProperty(key);
    if (val === null) {
      props.setProperty(key, defaultValue);
      console.warn(
        `Missing Property Created: [${key}]. Please set the actual ID.`
      );
      return defaultValue;
    }
    return val;
  }

  /**
   * メイン処理
   */
  public generate(): void {
    this.validateAndThrow();

    const todayStr = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');
    const fileName = `フォルダ構成レポート_${todayStr}`;

    // 今日のスプレッドシートを取得または新規作成
    const ss = this.getOrCreateSpreadsheet(fileName);
    const jsonFolder = DriveApp.getFolderById(this.jsonFolderId);
    const files = jsonFolder.getFilesByType(MimeType.PLAIN_TEXT);

    while (files.hasNext()) {
      const file = files.next();
      const rawName = file.getName();

      // 「フォルダ構成_」で始まり「.json」で終わるファイルのみ対象
      if (!rawName.startsWith('フォルダ構成_') || !rawName.endsWith('.json')) {
        continue;
      }

      /**
       * シート名の抽出
       * ファイル名形式: フォルダ構成_ドライブ名_日時_p001.json
       * アンダースコアで分割して2番目（インデックス1）をドライブ名として採用
       */
      const nameParts = rawName.split('_');
      const sheetName = nameParts.length >= 2 ? nameParts[1] : 'Unknown';

      let sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        // Part1のファイルなら、既存シートをクリアして上書き開始
        if (rawName.includes('_p001')) {
          sheet.clear();
          console.log(`Cleared existing sheet: ${sheetName}`);
        }
      } else {
        sheet = ss.insertSheet(sheetName);
        console.log(`Created new sheet: ${sheetName}`);
      }

      this.writeJsonToSheet(file, sheet);
    }

    // 「シート1」が初期状態で残っていれば削除
    const initialSheet =
      ss.getSheetByName('シート1') || ss.getSheetByName('Sheet1');
    if (
      initialSheet &&
      initialSheet.getLastRow() === 0 &&
      ss.getSheets().length > 1
    ) {
      ss.deleteSheet(initialSheet);
    }

    console.log(`レポート生成完了: ${ss.getUrl()}`);
  }

  /**
   * 指定フォルダ内に今日のSSがあるか確認し、なければ新規作成して移動
   */
  private getOrCreateSpreadsheet(
    fileName: string
  ): GoogleAppsScript.Spreadsheet.Spreadsheet {
    const outputFolder = DriveApp.getFolderById(this.outputFolderId);
    const files = outputFolder.getFilesByName(fileName);

    if (files.hasNext()) {
      const file = files.next();
      return SpreadsheetApp.openById(file.getId());
    } else {
      const newSS = SpreadsheetApp.create(fileName);
      const file = DriveApp.getFileById(newSS.getId());
      file.moveTo(outputFolder);
      return newSS;
    }
  }

  /**
   * JSON解析と書き込み（すべて文字列として出力）
   */
  private writeJsonToSheet(
    file: GoogleAppsScript.Drive.File,
    sheet: GoogleAppsScript.Spreadsheet.Sheet
  ): void {
    const content = file.getBlob().getDataAsString();
    let data: any[];
    try {
      data = JSON.parse(content);
    } catch (e) {
      console.error(`Failed to parse JSON: ${file.getName()}`);
      return;
    }

    if (!data || data.length === 0) return;

    const headers = ['id', 'name', 'fullPath', 'createdTime'];
    const rows: string[][] = [];

    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      rows.push(headers);
    }

    data.forEach(item => {
      rows.push([
        item.id ? String(item.id) : '',
        item.name ? String(item.name) : '',
        item.fullPath ? String(item.fullPath) : '', // パス情報を出力
        item.createdTime ? String(item.createdTime) : '',
      ]);
    });

    // 書き込む範囲を特定
    const targetRange = sheet.getRange(
      lastRow + 1,
      1,
      rows.length,
      headers.length
    );

    // 書式を「テキスト」に設定
    // '@' は Google スプレッドシートにおけるプレーンテキスト形式の表示形式コードです
    targetRange.setNumberFormat('@');

    // データの書き込み
    targetRange.setValues(rows);

    // 見栄えの調整（初回書き込み時のみ）
    if (lastRow === 0) {
      sheet
        .getRange(1, 1, 1, headers.length)
        .setBackground('#d9ead3')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.autoResizeColumns(1, headers.length);
  }

  /**
   * 設定検証
   */
  private validateAndThrow(): void {
    const isDummy = (val: string) => !val || val.includes('SET_YOUR_');
    const errors: string[] = [];

    if (isDummy(this.outputFolderId)) errors.push(this.PROP_OUTPUT_FOLDER);
    if (isDummy(this.jsonFolderId)) errors.push(this.PROP_JSON_FOLDER);

    if (errors.length > 0) {
      throw new Error(
        `[Configuration Error] 以下のプロパティを設定してください: ${errors.join(', ')}`
      );
    }
  }
}

/**
 * Entry Point
 */
export const runReportGeneration_ = () =>
  new FolderReportGenerator().generate();
