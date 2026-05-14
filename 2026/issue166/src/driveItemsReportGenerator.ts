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
 * DriveItemsReportGenerator.ts
 */

class DriveItemsReportGenerator {
  private readonly PROP_JSON_FOLDER = 'SAVE_DESTINATION_FOLDER_ID';
  private readonly PROP_OUTPUT_FOLDER = 'REPORT_OUTPUT_FOLDER_ID';
  private readonly PROP_LAST_SS_ID = 'LAST_REPORT_SS_ID';
  private readonly PROP_SHEET_MAP = 'REPORT_SHEET_ID_MAP';

  private jsonFolderId: string;
  private outputFolderId: string;

  constructor() {
    const props = PropertiesService.getScriptProperties();
    this.jsonFolderId = props.getProperty(this.PROP_JSON_FOLDER) || '';
    this.outputFolderId = this.getOrSetDefault(
      props,
      this.PROP_OUTPUT_FOLDER,
      'SET_YOUR_OUTPUT_FOLDER_ID_HERE'
    );
  }

  private getOrSetDefault(
    props: GoogleAppsScript.Properties.Properties,
    key: string,
    defaultValue: string
  ): string {
    const val = props.getProperty(key);
    if (val === null) {
      props.setProperty(key, defaultValue);
      console.warn(`Missing Property Created: [${key}].`);
      return defaultValue;
    }
    return val;
  }

  public generate(): void {
    this.validateAndThrow();

    const todayStr = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');
    const fileName = `フォルダ構成レポート_${todayStr}`;

    const ss = this.getOrCreateSpreadsheet(fileName);
    const jsonFolder = DriveApp.getFolderById(this.jsonFolderId);
    const files = jsonFolder.getFilesByType(MimeType.PLAIN_TEXT);

    // シートIDを記録するためのマップ
    const sheetIdMap: { [key: string]: number } = {};

    while (files.hasNext()) {
      const file = files.next();
      const rawName = file.getName();

      if (!rawName.startsWith('フォルダ構成_') || !rawName.endsWith('.json')) {
        continue;
      }

      const nameParts = rawName.split('_');
      const sheetName = nameParts.length >= 2 ? nameParts[1] : 'Unknown';

      let sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        if (rawName.includes('_p001')) {
          sheet.clear();
          console.log(`Cleared existing sheet: ${sheetName}`);
        }
      } else {
        sheet = ss.insertSheet(sheetName);
        console.log(`Created new sheet: ${sheetName}`);
      }

      // シートID(gid)をマップに格納
      sheetIdMap[sheetName] = sheet.getSheetId();

      this.writeJsonToSheet(file, sheet);
    }

    // マップをJSON文字列にしてプロパティに保存
    PropertiesService.getScriptProperties().setProperty(
      this.PROP_SHEET_MAP,
      JSON.stringify(sheetIdMap)
    );

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

  private getOrCreateSpreadsheet(
    fileName: string
  ): GoogleAppsScript.Spreadsheet.Spreadsheet {
    const outputFolder = DriveApp.getFolderById(this.outputFolderId);
    const files = outputFolder.getFilesByName(fileName);
    let ss: GoogleAppsScript.Spreadsheet.Spreadsheet;

    if (files.hasNext()) {
      const file = files.next();
      ss = SpreadsheetApp.openById(file.getId());
    } else {
      ss = SpreadsheetApp.create(fileName);
      const file = DriveApp.getFileById(ss.getId());
      file.moveTo(outputFolder);
    }

    // スプレッドシートIDをプロパティに保存
    PropertiesService.getScriptProperties().setProperty(
      this.PROP_LAST_SS_ID,
      ss.getId()
    );

    return ss;
  }

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

    const headers = ['id', '分類', 'name', 'fullPath', 'createdTime'];
    const rows: any[][] = [];

    const lastRow = sheet.getLastRow();
    if (lastRow === 0) {
      rows.push(headers);
    }

    data.forEach(item => {
      rows.push([
        item.id ? String(item.id) : '',
        item.itemType ? String(item.itemType) : '',
        item.name ? String(item.name) : '',
        item.fullPath ? String(item.fullPath) : '',
        item.createdTime ? String(item.createdTime) : '',
      ]);
    });

    const targetRange = sheet.getRange(
      lastRow + 1,
      1,
      rows.length,
      headers.length
    );
    targetRange.setNumberFormat('@');
    targetRange.setValues(rows);

    if (lastRow === 0) {
      sheet
        .getRange(1, 1, 1, headers.length)
        .setBackground('#d9ead3')
        .setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
    sheet.autoResizeColumns(1, headers.length);
  }

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

export const runReportGeneration_ = () =>
  new DriveItemsReportGenerator().generate();
