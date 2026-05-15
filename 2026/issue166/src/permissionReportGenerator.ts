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
import { BaseReport } from './baseReport';
import * as Const from './const';
class PermissionReportGenerator extends BaseReport {
  constructor() {
    super();
  }
  public generateReport(targetDriveName: string): void {
    const sheetName = `${targetDriveName}_フォルダ構成`;
    /*const header = [
      'ID',
      'アイテム種別',
      '親フォルダパス',
      '名前',
      '作成日時',
      '更新日時',
    ];
    const sheet: GoogleAppsScript.Spreadsheet.Sheet = this.getOutputSheet(
      this.outputSpreadsheet,
      sheetName,
      header
    );*/
    const data: string[][] = this.getInputData(targetDriveName);
    console.log(data);
    //this.addDataToSheet(data, sheet);
  }

  private getInputData(targetDriveName: string): string[][] {
    return this.getOutputDataFromJsons<Const.ArchivedItem>(
      Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM,
      targetDriveName,
      item => [
        item.id ? String(item.id) : '',
        item.itemType ? String(item.itemType) : '',
        item.parentPath ? String(item.parentPath) : '',
        item.name ? String(item.name) : '',
        item.createdTime ? String(item.createdTime) : '',
        item.modifiedTime ? String(item.modifiedTime) : '',
      ]
    );
  }
}
