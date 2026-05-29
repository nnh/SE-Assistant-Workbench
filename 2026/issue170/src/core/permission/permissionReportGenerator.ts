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
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
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
          Boolean as unknown as (
            item: { fileName: string; data: Const.PermissionResponse } | null
          ) => item is { fileName: string; data: Const.PermissionResponse }
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
}
