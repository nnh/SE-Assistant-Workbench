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
import { BaseReport } from '../../baseReport';
import * as Const from '../../common/const';
class DriveItemsReportGenerator extends BaseReport {
  private targetDriveId: string | null;
  private targetDriveName: string;

  constructor() {
    super();
    const props = PropertiesService.getScriptProperties();
    this.targetDriveId = props.getProperty(
      Const.PROPERTY_KEYS.TARGET_SHARED_DRIVE_ID
    );
    if (!this.targetDriveId) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.TARGET_SHARED_DRIVE_ID} が設定されていません。スクリプトプロパティに共有ドライブ設定レポートの対象ドライブIDを設定してください。`
      );
    }
    this.targetDriveName =
      props.getProperty(Const.PROPERTY_KEYS.DRIVE_NAME) || '';
    if (!this.targetDriveName) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.DRIVE_NAME} が設定されていません。`
      );
    }
  }
  public generateReport(): void {
    const sheetName = `${this.targetDriveName}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
    const sheet: GoogleAppsScript.Spreadsheet.Sheet = this.getOutputSheet(
      this.outputSpreadsheet,
      sheetName,
      Const.REPORT_HEADERS.DRIVE_ITEM as string[]
    );
    const data: string[][] = this.getInputData();
    this.addDataToSheet(data, sheet);
  }

  private getInputData(): string[][] {
    return this.getOutputDataFromJsons<Const.ArchivedItem>(
      Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM,
      this.targetDriveName,
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

export const runReportGeneration_ = () =>
  new DriveItemsReportGenerator().generateReport();
