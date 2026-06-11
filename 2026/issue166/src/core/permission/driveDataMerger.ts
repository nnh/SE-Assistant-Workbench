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
import { BaseReport } from '../../baseReport';
import * as Const from '../../common/const';

export class DrivePermissionMatrixReport extends BaseReport {
  constructor(jsonFolderKey: string, outputSpreadsheetKey: string) {
    super(jsonFolderKey, outputSpreadsheetKey);
  }

  public execute(): void {
    const driveName = PropertiesService.getScriptProperties().getProperty(
      Const.PROPERTY_KEYS.DRIVE_NAME
    );
    if (!driveName) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.DRIVE_NAME} が設定されていません。スクリプトプロパティに対象共有ドライブ名を設定してください。`
      );
    }
    const folderSheetName = `${driveName}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
    const permissionSheetName = Const.SHEET_NAME.PERMISSION;

    const folderSheet = this.outputSpreadsheet.getSheetByName(folderSheetName);
    if (!folderSheet) {
      throw new Error(
        `スプレッドシートに「${folderSheetName}」シートが見つかりません。`
      );
    }
    const permissionSheet =
      this.outputSpreadsheet.getSheetByName(permissionSheetName);
    if (!permissionSheet) {
      throw new Error(
        `スプレッドシートに「${permissionSheetName}」シートが見つかりません。`
      );
    }
    console.log(
      `${folderSheetName}と${permissionSheetName}の結合処理を開始します。`
    );

    // 1. 各シートからデータを取得
    const folderValues = folderSheet.getDataRange().getValues() as string[][];
    const permissionValues = permissionSheet
      .getDataRange()
      .getValues() as string[][];

    // データが空（またはヘッダーのみ）の場合はスキップ
    if (folderValues.length <= 1) {
      throw new Error(
        `${folderSheetName}にデータがありません。結合処理を中止します。`
      );
    }
    if (permissionValues.length <= 1) {
      throw new Error(
        `${permissionSheetName}にデータがありません。結合処理を中止します。`
      );
    }

    // 2. 権限一覧データをマップ化（IDをキーにして高速検索）
    const permissionMap = new Map<string, string>();
    for (let i = 1; i < permissionValues.length; i++) {
      const row = permissionValues[i];
      const fileId =
        row[Const.INDEX.MERGE_DRIVE_PERMISSION.PERMISSION_SHEET_KEY];
      if (!fileId) continue;
      // すでに同じIDが存在する場合は改行(\n)で追記、初回は新しい値をそのまま設定
      const existingPermission = permissionMap.get(fileId) ?? '';
      const newPermission =
        row[Const.INDEX.MERGE_DRIVE_PERMISSION.PERMISSION_PERMISSION];
      permissionMap.set(
        fileId,
        existingPermission
          ? `${existingPermission}\n${newPermission}`
          : newPermission
      );
    }
    const outputValues = folderValues.map((row, index) => {
      if (index === 0) {
        // ヘッダー行に「権限」列を追加
        return [...row, '権限'];
      }
      const fileId = row[Const.INDEX.MERGE_DRIVE_PERMISSION.DRIVE_SHEET_KEY];
      const excludeCheck = row[6]; // G列（取得対象外判定）
      const permissions = permissionMap.get(fileId) || excludeCheck || '';
      return [...row, permissions];
    });

    // 3. 結合したデータを新しいシートに出力
    const headers = outputValues[0]; // ヘッダー行
    // C列、D列昇順でソートする（C列が同じ場合はD列でソート）
    const bodies = outputValues.slice(1).sort((a, b) => {
      const aC = a[2] || ''; // C列
      const bC = b[2] || '';
      if (aC < bC) return -1;
      if (aC > bC) return 1;
      const aD = a[3] || ''; // D列
      const bD = b[3] || '';
      if (aD < bD) return -1;
      if (aD > bD) return 1;
      return 0;
    });

    const outputSheet = this.initOutputSheet(driveName, headers);
    this.addDataToSheet(bodies, outputSheet);
    // A列、E列、F列を非表示にする
    outputSheet.hideColumns(1); // A列
    outputSheet.hideColumns(5); // E列
    outputSheet.hideColumns(6); // F列
    outputSheet.setColumnWidth(2, 90); // B列
  }
}

/**
 * 5.1. アクセス権マトリクスレポート生成処理のエントリーポイント関数。
 */
export const runDrivePermissionMatrixReportGeneration_ = (): void => {
  const report = new DrivePermissionMatrixReport(
    Const.PROPERTY_KEYS.JSON_FOLDER_ID,
    Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
  );
  report.execute();
};
