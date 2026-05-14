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
import * as Const from './const';
class DriveItemsReportGenerator {
  private readonly PROP_JSON_FOLDER = Const.PROPERTY_KEYS.JSON_FOLDER_ID;

  private jsonFolderId: string;

  constructor() {
    const props = PropertiesService.getScriptProperties();
    this.jsonFolderId = props.getProperty(this.PROP_JSON_FOLDER) || '';
  }

  private loadJsonFile(
    file: GoogleAppsScript.Drive.File
  ): Const.ArchivedItem[] | null {
    try {
      const content: string = file.getBlob().getDataAsString();
      const data: Const.ArchivedItem[] = JSON.parse(content);
      return data;
    } catch (e) {
      console.error(
        `Failed to load or parse JSON from file ${file.getName()}: ${e}`
      );
      return null;
    }
  }

  private getInputData() {
    const driveFolder = DriveApp.getFolderById(this.jsonFolderId);
    const files = driveFolder.getFiles();
    // 対象のJSONファイルだけを絞り込む

    const allData: { [driveName: string]: Const.ArchivedItem[] } = {};
    while (files.hasNext()) {
      const file = files.next();
      const data = this.loadJsonFile(file);
      if (data) {
        const driveName = file.getName().replace('.json', '');
        allData[driveName] = data;
      }
    }
    return allData;
  }

  private addDataToSheet(
    data: Const.ArchivedItem[],
    sheet: GoogleAppsScript.Spreadsheet.Sheet
  ): void {
    const headers = ['id', '分類', 'name', 'fullPath', 'createdTime'];
    const rows: string[][] = [];

    if (!data || data.length === 0) return;

    //const lastRow = sheet.getLastRow();

    data.forEach(item => {
      rows.push([
        item.id ? String(item.id) : '',
        item.itemType ? String(item.itemType) : '',
        item.name ? String(item.name) : '',
        item.fullPath ? String(item.fullPath) : '',
        item.createdTime ? String(item.createdTime) : '',
      ]);
    });
    /*
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
    */
  }
  /*
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
  }*/
}

//export const runReportGeneration_ = () =>
//  new DriveItemsReportGenerator().generate();
