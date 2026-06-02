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
   * 「作業用_権限出力対象IDリスト」シートのA列に記載されたファイルIDをもとに、
   * 対応するJSONファイルを読み込み、権限一覧シートへ出力・マージします。
   * @description
   * シートのA1セルから連続してIDを記載してください（ヘッダー行なし）。
   * 出力先は通常の権限一覧シートと同じです。既存データとのマージも行います。
   */
  public generateReportFromSpecifiedIds(): void {
    const idSheet = this.outputSpreadsheet.getSheetByName(
      Const.SHEET_NAME.PERMISSION_TARGET_ID_LIST
    );
    if (!idSheet) {
      throw new Error(
        `シート「${Const.SHEET_NAME.PERMISSION_TARGET_ID_LIST}」が見つかりません。A列にファイルIDを記載したシートを作成してください。`
      );
    }

    const lastRow = idSheet.getLastRow();
    if (lastRow === 0) {
      throw new Error(
        `シート「${Const.SHEET_NAME.PERMISSION_TARGET_ID_LIST}」にIDが記載されていません。`
      );
    }

    const specifiedIds: Set<string> = new Set(
      idSheet
        .getRange('A1:A' + lastRow)
        .getValues()
        .flat()
        .filter(
          (id: unknown): id is string =>
            typeof id === 'string' && id.trim() !== ''
        )
        .map((id: string) => id.trim())
    );

    // 権限一覧シートから、処理予定IDの既存行を事前に削除する
    const sheetName = Const.SHEET_NAME.PERMISSION;
    let outputSheet = this.outputSpreadsheet.getSheetByName(sheetName);
    if (!outputSheet) {
      outputSheet = this.outputSpreadsheet.insertSheet(sheetName);
    }
    const existingValues = outputSheet.getDataRange().getValues() as string[][];
    // 下から削除することで行番号のズレを防ぐ
    for (let i = existingValues.length - 1; i >= 1; i--) {
      if (specifiedIds.has(existingValues[i][0])) {
        outputSheet.deleteRow(i + 1);
      }
    }

    // フォルダ走査は1回だけ行い、itemId → File のマップを構築する
    const prefix = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_`;
    const fileMap = new Map<string, GoogleAppsScript.Drive.File>();
    const files = this.jsonFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      if (fileName.startsWith(prefix) && fileName.endsWith('.json')) {
        const itemId = fileName.slice(prefix.length, -'.json'.length);
        if (specifiedIds.has(itemId)) {
          const existing = fileMap.get(itemId);
          if (!existing || file.getLastUpdated() > existing.getLastUpdated()) {
            fileMap.set(itemId, file);
          }
        }
      }
    }

    // IDごとに処理し、完了したら即座にシートの該当行をクリアする
    const idValues = idSheet.getRange('A1:A' + lastRow).getValues();
    for (let i = 0; i < idValues.length; i++) {
      const id = String(idValues[i][0]).trim();
      if (!id) continue;

      const file = fileMap.get(id);
      if (file) {
        const outputData = this.editOutputData([file]);
        const resultRows = this.formatReportRows(outputData);

        if (outputSheet.getLastRow() === 0) {
          this.setHeader(
            outputSheet,
            Const.REPORT_HEADERS.PERMISSION as string[]
          );
        }
        this.addDataToSheet(resultRows, outputSheet);
      }

      idSheet.getRange(i + 1, 1).clearContent();
    }
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
   * @returns {string[][]} レポートシート用のデータ配列
   * @private
   */
  private formatReportRows(outputData: string[][]): string[][] {
    const prefix = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_`;
    return outputData.map(row => {
      const fileId = row[Const.INDEX.PERMISSION_ARRAY.FILENAME].slice(
        prefix.length,
        -'.json'.length
      );

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
}

/**
 * 2.4. 「作業用_権限出力対象IDリスト」シートに記載したファイルIDの権限情報を出力します。
 */
export const runPermissionReportGenerationFromSpecifiedIds_ = (): void => {
  const generator = new PermissionReportGenerator(
    Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID,
    Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
  );
  generator.generateReportFromSpecifiedIds();
};
