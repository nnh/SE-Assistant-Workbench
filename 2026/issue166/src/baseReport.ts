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
import { getFolderById_ } from './utils';
import { JsonDataHandler } from './jsonDataHandler';
import { SpreadsheetHandler } from './spreadsheetHandler';

export abstract class BaseReport {
  protected jsonHandler: JsonDataHandler;
  protected ssHandler: SpreadsheetHandler;
  protected jsonFolder: GoogleAppsScript.Drive.Folder;
  protected outputSpreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

  constructor(
    jsonFolderKey: string = Const.PROPERTY_KEYS.JSON_FOLDER_ID,
    outputSpreadsheetKey: string = Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
  ) {
    const props = PropertiesService.getScriptProperties();

    // プロパティキーを使用してIDを取得
    const jsonFolderId = props.getProperty(jsonFolderKey) || '';
    if (!jsonFolderId) {
      props.setProperty(jsonFolderKey, 'SET_YOUR_JSON_FOLDER_ID_HERE');
      throw new Error(
        `プロパティ ${jsonFolderKey} が設定されていません。スクリプトプロパティにJSON保存先のフォルダIDを設定してください。`
      );
    }
    this.jsonFolder = getFolderById_(jsonFolderId);

    const outputSsId = props.getProperty(outputSpreadsheetKey) || '';
    if (!outputSsId) {
      props.setProperty(outputSpreadsheetKey, 'SET_YOUR_SPREADSHEET_ID_HERE');
      throw new Error(
        `プロパティ ${outputSpreadsheetKey} が設定されていません。スクリプトプロパティに出力先のスプレッドシートIDを設定してください。`
      );
    }
    this.outputSpreadsheet = SpreadsheetApp.openById(outputSsId);

    // ハンドラーの初期化
    this.jsonHandler = new JsonDataHandler(this.jsonFolder);
    this.ssHandler = new SpreadsheetHandler(this.outputSpreadsheet);
  }

  // --- JSON 系の委譲メソッド ---
  protected loadJsonFile<T>(file: GoogleAppsScript.Drive.File) {
    return this.jsonHandler.loadJsonFile<T>(file);
  }

  protected getTargetJsonFiles(prefix: string, targetDriveName: string) {
    return this.jsonHandler.getTargetJsonFiles(prefix, targetDriveName);
  }

  protected fetchAndCombineJsonData<T>(
    prefix: string,
    targetDriveName: string
  ) {
    return this.jsonHandler.combineJsonData<T>(prefix, targetDriveName);
  }

  protected getOutputDataFromJsons<T>(
    prefix: string,
    targetDriveName: string,
    rowMapper: (item: T) => string[]
  ) {
    const allItems = this.fetchAndCombineJsonData<T>(prefix, targetDriveName);
    return allItems.map(item => rowMapper(item));
  }

  // --- Spreadsheet 系の委譲メソッド ---
  protected setHeader(
    sheet: GoogleAppsScript.Spreadsheet.Sheet,
    headers: string[]
  ) {
    this.ssHandler.setHeader(sheet, headers);
  }

  protected getOutputSheet(ss: any, sheetName: string, headers: string[]) {
    return this.ssHandler.getOutputSheet(sheetName, headers);
  }

  protected addDataToSheet(
    data: string[][],
    sheet: GoogleAppsScript.Spreadsheet.Sheet
  ) {
    this.ssHandler.addDataToSheet(data, sheet);
  }
}
