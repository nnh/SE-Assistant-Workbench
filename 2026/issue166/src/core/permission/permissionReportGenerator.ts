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

/**
 * アーカイブされた詳細権限JSONファイル群を解析・編集し、
 * 共有ドライブの総合アクセス権限レポートシートを生成・マージ出力するクラス。
 * * 基底クラス {@link BaseReport} を継承し、既存レコードの差分更新（アップデート）に対応した
 * 高度なレポート出力フローを提供します。
 */
export class PermissionReportGenerator extends BaseReport {
  /**
   * PermissionReportGenerator のインスタンスを初期化します。
   * @param {string} jsonFolderKey - 保存先フォルダIDを取得するためのキー名
   * @param {string} outputSpreadsheetKey - 出力先スプレッドシートIDを取得するためのキー名
   */
  constructor(jsonFolderKey: string, outputSpreadsheetKey: string) {
    super(jsonFolderKey, outputSpreadsheetKey);
  }

  /**
   * 共有ドライブのアクセス権限レポートを生成し、スプレッドシートへ出力・マージします。
   */
  public generateReport(): void {
    const sheetName = Const.SHEET_NAME.PERMISSION;
    const ss: GoogleAppsScript.Spreadsheet.Spreadsheet = this.outputSpreadsheet;

    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }

    const data = this.getInputData();
    const outputData = this.editOutputData(data);

    const updateIds: Set<string> = new Set();
    const resultRows = this.formatReportRows(outputData, updateIds);

    const saveValues = sheet.getDataRange().getValues() as string[][];
    const combinedValues = this.mergeWithExistingData(
      saveValues,
      resultRows,
      updateIds
    );

    this.setHeader(sheet, Const.REPORT_HEADERS.PERMISSION as string[]);
    this.addDataToSheet(combinedValues, sheet);
  }

  /**
   * 処理対象とするJSONファイルを取得します。
   * * @description
   * ファイル名の形式は「permission_${FileId}.json」とし、拡張子がJSONであることを条件に抽出します。
   * 「&{ドライブ名}_フォルダ構成」シートのA列にあるファイルIDに存在するFileIdのJSONファイルのみを対象とします。
   * 取得したファイルは、パーミッション情報の出力に使用します。
   * * @private
   * @returns {GoogleAppsScript.Drive.File[]} 処理対象のJSONファイルの配列
   */
  private getInputData(): GoogleAppsScript.Drive.File[] {
    const ss: GoogleAppsScript.Spreadsheet.Spreadsheet = this.outputSpreadsheet;
    const targetDriveName = PropertiesService.getScriptProperties().getProperty(
      Const.PROPERTY_KEYS.DRIVE_NAME
    );
    if (!targetDriveName) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.DRIVE_NAME} が設定されていません。スクリプトプロパティに対象共有ドライブ名を設定してください。`
      );
    }
    const folderSheetName = `${targetDriveName}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
    const folderSheet = ss.getSheetByName(folderSheetName);
    if (!folderSheet) {
      throw new Error(`シート「${folderSheetName}」が見つかりません。`);
    }
    const targetFileIds: string[] = folderSheet
      .getRange('A2:A' + folderSheet.getLastRow())
      .getValues()
      .flat()
      .filter(
        (id: unknown): id is string =>
          typeof id === 'string' && id.trim() !== ''
      )
      .map((id: string) => id.trim());
    const targetFileIdSet: Set<string> = new Set(targetFileIds);
    const targetJsonList: GoogleAppsScript.Drive.File[] = [];
    const files = this.jsonFolder.getFiles();

    const prefix = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_`;
    const fileMap = new Map<string, GoogleAppsScript.Drive.File>();
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      if (fileName.startsWith(prefix) && fileName.endsWith('.json')) {
        const itemId = fileName.slice(prefix.length, -'.json'.length);
        if (targetFileIdSet.has(itemId)) {
          const existing = fileMap.get(fileName);
          if (!existing || file.getLastUpdated() > existing.getLastUpdated()) {
            fileMap.set(fileName, file);
          }
        }
      }
    }

    return Array.from(fileMap.values());
  }

  /**
   * JSONファイルの内容を編集して出力用データを作成します。
   * * @description
   * 取得したJSONファイルの内容を解析し、スプレッドシートに出力する形式に変換します。
   * 💡 ポリシーレポート側（sharedDrivePolicyReportGenerator）から再利用されるため public に公開します。
   * @param {GoogleAppsScript.Drive.File[]} targetJsonList - 処理対象のJSONファイルの配列
   * @returns {string[][]} スプレッドシートに出力するための2次元配列
   * @public
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
          (
            item
          ): item is { fileName: string; data: Const.PermissionResponse } =>
            item !== null
        );
    const outputData: string[][] = [];

    rawData.forEach(({ fileName, data }) => {
      if (!data?.permissions) return;
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
            item.deleted != null ? String(item.deleted) : '',
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

  /**
   * 権限（ロール）の英語システム名を対応する日本語表記に変換します。
   * @param {string} role - 変換対象のロール名
   * @returns {string} 日本語に翻訳されたロール名
   * @private
   */
  private setRoleJapanese(role: string): string {
    const ROLE_MAP: Record<string, string> = {
      owner: 'オーナー',
      organizer: '管理者',
      fileOrganizer: 'コンテンツ管理者',
      writer: '投稿者',
      reader: '閲覧者',
      commenter: '閲覧者（コメント可）',
    };
    return ROLE_MAP[role] ?? role ?? '';
  }

  /**
   * 展開された生データ配列を、レポート表示用の整形済み行データに変換します。
   * @param {string[][]} outputData - editOutputData から取得した生データの配列
   * @param {Set<string>} updateIds - 更新対象のファイルIDを蓄積するための参照用Setオブジェクト
   * @returns {string[][]} レポートシート用のデータ配列
   * @private
   */
  private formatReportRows(
    outputData: string[][],
    updateIds: Set<string>
  ): string[][] {
    return outputData.map(row => {
      const fileId = row[Const.INDEX.PERMISSION_ARRAY.FILENAME]
        .replace('permission_', '')
        .replace('.json', '');

      if (fileId) updateIds.add(fileId);

      const nameAndEmailAddress =
        row[Const.INDEX.PERMISSION_ARRAY.ID] === 'anyoneWithLink'
          ? 'リンクを知っている全員'
          : row[Const.INDEX.PERMISSION_ARRAY.TYPE] === 'domain'
            ? row[Const.INDEX.PERMISSION_ARRAY.DISPLAY_NAME]
            : row[Const.INDEX.PERMISSION_ARRAY.DELETED] === 'true'
              ? '【削除されたアカウント】'
              : `${row[Const.INDEX.PERMISSION_ARRAY.DISPLAY_NAME]}(${row[Const.INDEX.PERMISSION_ARRAY.EMAIL_ADDRESS]})`;

      const detailRole = row[Const.INDEX.PERMISSION_ARRAY.DETAIL_ROLE] ?? '';
      const role = this.setRoleJapanese(detailRole);
      const outputRole =
        role !== row[Const.INDEX.PERMISSION_ARRAY.ROLE]
          ? `${role}（${row[Const.INDEX.PERMISSION_ARRAY.ROLE]}）`
          : role;

      const nameAndEmailAndRole = `${nameAndEmailAddress}：${outputRole}`;
      const inheritedFrom =
        row[Const.INDEX.PERMISSION_ARRAY.INHERITED] === 'true'
          ? '（上位フォルダから継承）'
          : '';

      return [fileId, nameAndEmailAndRole, inheritedFrom];
    });
  }

  /**
   * 既存のシートデータから、今回更新対象となったIDの古いレコードを除外し、新しいデータと結合します。
   * @param {string[][]} saveValues - シートから読み込んだ既存の全データ
   * @param {string[][]} newResults - 今回新しく処理したデータの配列
   * @param {Set<string>} updateIds - 今回更新されたファイルIDのセット
   * @returns {string[][]} 結合・フィルタリングが完了した2次元配列データ
   * @private
   */
  private mergeWithExistingData(
    saveValues: string[][],
    newResults: string[][],
    updateIds: Set<string>
  ): string[][] {
    const hasData =
      saveValues.length > 0 && saveValues[0].some(cell => cell !== '');
    if (!hasData) return newResults;

    const filteredValues = saveValues.slice(1).filter(row => {
      const fileId = row[0];
      return !updateIds.has(fileId);
    });

    return [...newResults, ...filteredValues];
  }
}

/**
 * 2.4. 権限レポート出力処理のエントリーポイント関数。
 */
export const runPermissionReportGeneration_ = (): void => {
  const generator = new PermissionReportGenerator(
    Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID,
    Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
  );
  generator.generateReport();
};
