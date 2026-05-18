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
  public generateReport(): void {
    const sheetName = Const.SHEET_NAME.PERMISSION;
    const ss: GoogleAppsScript.Spreadsheet.Spreadsheet = this.outputSpreadsheet;
    let sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
      ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    const data: GoogleAppsScript.Drive.File[] = this.getInputData();
    const updateIds: Set<string> = new Set();
    const outputData: string[][] = this.editOutputData(data);
    const result = outputData.map(row => {
      const fileId = row[Const.INDEX.PERMISSION_ARRAY.FILENAME]
        .replace('permission_', '')
        .replace('.json', '');
      fileId && updateIds.add(fileId);
      const nameAndEmailAddress =
        row[Const.INDEX.PERMISSION_ARRAY.ID] === 'anyoneWithLink'
          ? 'リンクを知っている全員'
          : row[Const.INDEX.PERMISSION_ARRAY.TYPE] === 'domain'
            ? row[Const.INDEX.PERMISSION_ARRAY.DISPLAY_NAME]
            : row[Const.INDEX.PERMISSION_ARRAY.DELETED] === 'true'
              ? '【削除されたアカウント】'
              : `${row[Const.INDEX.PERMISSION_ARRAY.DISPLAY_NAME]}(${row[Const.INDEX.PERMISSION_ARRAY.EMAIL_ADDRESS]})`;
      const role = this.setRoleJapanese(
        row[Const.INDEX.PERMISSION_ARRAY.DETAIL_ROLE] ?? ''
      );
      const outputRole =
        role !== row[Const.INDEX.PERMISSION_ARRAY.ROLE]
          ? `${role}（${row[Const.INDEX.PERMISSION_ARRAY.ROLE]}）`
          : role; // role と displayName が異なる場合は両方表示する
      const nameAndEmailAndRole = `${nameAndEmailAddress}：${outputRole}`; // 名前とメールアドレスとロールを結合して1列にする
      const inheritedFrom =
        row[Const.INDEX.PERMISSION_ARRAY.INHERITED] === 'true'
          ? `（上位フォルダから継承）`
          : '';

      return [fileId, nameAndEmailAndRole, inheritedFrom];
    });
    // 既存のデータから今回更新するIDのレコードを削除する
    const saveValues = sheet.getDataRange().getValues() as string[][];

    const hasData =
      saveValues.length > 0 && saveValues[0].some(cell => cell !== '');

    const filteredValues = hasData
      ? saveValues.slice(1).filter(row => {
          const fileId = row[0];
          return !updateIds.has(fileId);
        })
      : [];

    const combinedValues = [...result, ...filteredValues];

    this.setHeader(sheet, Const.REPORT_HEADERS.PERMISSION as string[]); // ヘッダーを設定
    this.addDataToSheet(combinedValues, sheet);
  }
  /**
   * 処理対象とするJSONファイルを取得します。
   * * @description
   * JSONファイルの保存先フォルダ内から、今日更新されたJSONファイルを対象とします。
   * ファイル名の形式は「permission_YYYYMMDD_HHMMSS.json」とし、拡張子がJSONであることを条件に抽出します。
   * 取得したファイルは、パーミッション情報の出力に使用します。
   * * @private
   * @returns 今日更新されたJSONファイルの配列
   */
  private getInputData(): GoogleAppsScript.Drive.File[] {
    const targetFolder: GoogleAppsScript.Drive.Folder | undefined =
      DriveApp.getFolderById(this.jsonFolder.getId());
    if (!targetFolder) {
      throw new Error('JSONファイルの保存先フォルダが見つかりません。');
    }

    // 今日更新されたJSONファイルを取得する
    const targetJsonList: GoogleAppsScript.Drive.File[] = [];
    const files = targetFolder.getFiles();

    // 今日の日付の「始まり（0時0分0秒0ミリ秒）」を設定
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    while (files.hasNext()) {
      const file = files.next();

      // 拡張子がJSON、かつ更新日時が今日の0時以降のものを抽出
      if (
        file.getName().startsWith(Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION) &&
        file.getName().endsWith('.json') &&
        file.getLastUpdated() >= todayStart
      ) {
        targetJsonList.push(file);
      }
    }
    return targetJsonList;
  }
  private setRoleJapanese(role: string): string {
    const roleJp =
      role === 'owner'
        ? 'オーナー'
        : role === 'organizer'
          ? '管理者'
          : role === 'fileOrganizer'
            ? 'コンテンツ管理者'
            : role === 'writer'
              ? '投稿者'
              : role === 'reader'
                ? '閲覧者'
                : role === 'commenter'
                  ? '閲覧者（コメント可）'
                  : (role ?? '');
    return roleJp;
  }
  /**
   * JSONファイルの内容を編集して出力用データを作成します。
   * * @description
   * 取得したJSONファイルの内容を解析し、スプレッドシートに出力する形式に変換します。
   * * @private
   * @param targetJsonList 処理対象のJSONファイルの配列
   * @returns スプレッドシートに出力するための2次元配列
   */
  public editOutputData(
    targetJsonList: GoogleAppsScript.Drive.File[]
  ): string[][] {
    const rawData: { fileName: string; data: Const.PermissionResponse }[] =
      targetJsonList
        .map(file => {
          const data = this.loadJsonFile<Const.PermissionResponse>(file);
          return data ? { fileName: file.getName(), data } : null;
        })
        .filter(
          Boolean as unknown as (
            item: { fileName: string; data: Const.PermissionResponse } | null
          ) => item is { fileName: string; data: Const.PermissionResponse }
        ); // null を除外
    const outputData: string[][] = [];

    rawData.forEach(({ fileName, data }) => {
      if (!data?.permissions) return; // response 自体や permissions がない場合をガード
      data.permissions.forEach(item => {
        if (!item?.permissionDetails) return;
        const roleJp = this.setRoleJapanese(item.role ?? '');
        item.permissionDetails.forEach(detail => {
          outputData.push([
            String(fileName),
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
export const runPermissionReportGeneration_ = (): void => {
  const generator = new PermissionReportGenerator(
    Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID,
    Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
  );
  generator.generateReport();
};
