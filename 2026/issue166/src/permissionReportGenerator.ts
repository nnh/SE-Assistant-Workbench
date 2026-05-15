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
export class PermissionReportGenerator extends BaseReport {
  constructor(jsonFolderKey: string, outputSpreadsheetKey: string) {
    super(jsonFolderKey, outputSpreadsheetKey);
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

  public getInputData(targetDriveName: string): string[][] {
    // 1. JSONファイルをすべて読み込む
    const rawDataList: GoogleAppsScript.Drive.File[] = this.getTargetJsonFiles(
      Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION,
      targetDriveName
    );
    const rawData: Const.PermissionResponse[] = rawDataList
      .map(file => this.loadJsonFile<Const.PermissionResponse>(file))
      .filter(
        Boolean as unknown as (
          item: Const.PermissionResponse | null
        ) => item is Const.PermissionResponse
      ); // null を除外

    const outputData: string[][] = [];

    rawData.forEach(data => {
      if (!data?.permissions) return; // response 自体や permissions がない場合をガード
      data.permissions.forEach(item => {
        if (!item?.permissionDetails) return;
        const roleJp =
          item.role === 'owner'
            ? 'オーナー'
            : item.role === 'organizer'
              ? '管理者'
              : item.role === 'fileOrganizer'
                ? 'コンテンツ管理者'
                : item.role === 'writer'
                  ? '投稿者'
                  : item.role === 'reader'
                    ? '閲覧者'
                    : item.role === 'commenter'
                      ? '閲覧者（コメント可）'
                      : (item.role ?? '');
        item.permissionDetails.forEach(detail => {
          outputData.push([
            String(item.id ?? ''),
            String(item.type ?? ''),
            String(item.displayName ?? ''),
            String(roleJp ?? item.role ?? ''),
            String(item.emailAddress ?? ''),
            item.deleted !== undefined && item.deleted !== null
              ? String(item.deleted)
              : '',
            String(detail.permissionType ?? ''),
            String(detail.inheritedFrom ?? ''),
            String(detail.role ?? ''),
            String(detail.inherited ?? ''),
          ]);
        });
      });
    });
    return outputData;
  }
}
