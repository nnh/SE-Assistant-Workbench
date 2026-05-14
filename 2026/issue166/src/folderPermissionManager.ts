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
 * FolderPermissionManager.ts
 * スプレッドシート上のIDを読み取り、詳細な権限を取得して「調査対象名_権限」シートへ出力するクラス。
 */

/**
 * FolderPermissionManager.ts
 */

export class FolderPermissionManager {
  private readonly PROP_LAST_SS_ID = 'LAST_REPORT_SS_ID';
  private readonly PROP_SHEET_MAP = 'REPORT_SHEET_ID_MAP';

  private ss: GoogleAppsScript.Spreadsheet.Spreadsheet | null = null;
  private sheetIdMap: { [key: string]: number } = {};

  /**
   * 設定のロード
   */
  private loadConfig(): void {
    const props = PropertiesService.getScriptProperties();
    const lastSsId = props.getProperty(this.PROP_LAST_SS_ID);
    const sheetMapJson = props.getProperty(this.PROP_SHEET_MAP);

    if (!lastSsId || !sheetMapJson) {
      throw new Error(
        'レポート情報がプロパティに見つかりません。先にレポート生成を実行してください。'
      );
    }

    this.ss = SpreadsheetApp.openById(lastSsId);
    this.sheetIdMap = JSON.parse(sheetMapJson);
  }

  /**
   * 指定したシートのA列からIDを抽出して配列で返す
   */
  public fetchIdsFromSheet(sheetName: string): string[] {
    if (!this.ss) this.loadConfig();

    const targetSheetId = this.sheetIdMap[sheetName];
    if (targetSheetId === undefined) {
      throw new Error(
        `シート名「${sheetName}」に対応するシートIDがプロパティに見つかりません。`
      );
    }

    const targetSheet = this.getSheetById(this.ss!, targetSheetId);
    if (!targetSheet) {
      throw new Error(`ID: ${targetSheetId} のシートが見つかりません。`);
    }

    const lastRow = targetSheet.getLastRow();
    if (lastRow < 2) return [];

    const idValues: any[][] = targetSheet
      .getRange(2, 1, lastRow - 1, 1)
      .getValues();

    return idValues
      .map(row => String(row[0]).trim())
      .filter(id => id !== '' && id.toLowerCase() !== 'id');
  }

  /**
   * メイン処理：配列で受け取ったIDリストを元に権限レポートを生成する
   * (シート名を指定して実行する場合も、内部でこれを利用する)
   */
  public exportPermissions(targetIds: string[], reportSheetName: string): void {
    if (!this.ss) this.loadConfig();
    if (targetIds.length === 0) {
      console.log('処理対象のIDがありません。');
      return;
    }

    let reportSheet = this.ss!.getSheetByName(reportSheetName);
    if (!reportSheet) {
      reportSheet = this.ss!.insertSheet(reportSheetName);
    } else {
      reportSheet.clear();
    }

    // ヘッダー（preparePermissionRowsの出力項目に合わせる）
    const headers = [
      'id',
      'displayName',
      'type',
      'permissionDetails',
      'emailAddress',
      'role',
      'allowFileDiscovery',
      'domain',
      'deleted',
      'view',
      'disableInheritance',
      'fileName',
    ];
    reportSheet.appendRow(headers);
    reportSheet
      .getRange(1, 1, 1, headers.length)
      .setBackground('#d9ead3')
      .setFontWeight('bold');
    reportSheet.setFrozenRows(1);
    /*
    targetIds.forEach((id, index) => {
      const rows = this.preparePermissionRows(id);
      if (rows.length > 0) {
        reportSheet!
          .getRange(
            reportSheet!.getLastRow() + 1,
            1,
            rows.length,
            headers.length
          )
          .setNumberFormat('@')
          .setValues(rows);
      }
      if ((index + 1) % 10 === 0)
        console.log(`進捗: ${index + 1} / ${targetIds.length}`);
    });
*/
    reportSheet.autoResizeColumns(1, headers.length);
  }

  /**
   * 指定されたアイテムIDの権限情報を取得し、スプレッドシート等に書き込み可能な二次元配列形式に変換します。
   * @param fileId ファイルまたはフォルダのID
   * @returns 整形済みの二次元配列（権限がない場合やエラー時は空配列）
   */
  /*
  public preparePermissionRows(fileId: string): string[][] {
    try {
      const fileName = this.getItemName(fileId);
      const permissions = this.fetchPermissions(fileId);
      const rows: string[][] = [];

      if (!permissions || permissions.length === 0) return [];

      permissions.forEach(p => {
        // 1. permissionDetails (継承詳細) の整形
        let details = '';
        if (p.permissionDetails && p.permissionDetails.length > 0) {
          details = p.permissionDetails
            .map((d: any) => {
              const permissionType = d.permissionType || 'd_permissionType N/A';
              const role = d.role || 'd_role N/A';
              const inheritedFrom = d.inheritedFrom || 'd_inheritedFrom N/A';
              const inherited =
                d.inherited !== undefined
                  ? String(d.inherited)
                  : 'd_inherited N/A';
              return [permissionType, inheritedFrom, role, inherited].join(
                ', '
              );
            })
            .join(' | ');
        }

        // 2. 表示名の決定
        let displayName = p.displayName || 'p_displayName not set';
        if (p.type === 'anyone' && p.displayName === undefined) {
          displayName = 'Anyone with the link';
        }

        // 3. メールアドレス/ドメイン情報の決定
        let emailAddress = p.emailAddress || '';
        if (p.type === 'user' || p.type === 'group') {
          emailAddress = p.emailAddress || 'p_emailAddress not set';
        } else if (p.type === 'domain') {
          emailAddress = p.domain || 'p_domain not set'; // ドメインの場合はドメイン名を入れるなど
        }

        // 4. その他のフラグ・属性の決定
        const p_allowFileDiscovery =
          p.type === 'domain' || p.type === 'anyone'
            ? String(p.allowFileDiscovery ?? 'false')
            : '';

        const domain =
          p.type === 'domain' ? p.domain || 'p_domain not set' : '';

        const deleted =
          p.type === 'user' || p.type === 'group'
            ? String(p.deleted ?? 'false')
            : '';

        // 5. 最終的な1行(row)を構築
        rows.push([
          fileId, // ID
          displayName, // 名前
          p.type || 'p_type not set', // 種類
          details, // 権限詳細（継承等）
          emailAddress, // メールアドレス
          p.role || 'p_role not set', // 役割
          p_allowFileDiscovery, // 検索可能性
          domain, // ドメイン
          deleted, // 削除済み
          p.view || 'p_view not set', // ビュー
          p.inheritedPermissionsDisabled !== undefined
            ? String(p.inheritedPermissionsDisabled)
            : 'p_inheritedPermissionsDisabled N/A', // 継承の無効化
          fileName, // ファイル名
        ]);
      });

      return rows;
    } catch (e) {
      console.error(
        `権限情報の生成中にエラーが発生しました (ID: ${fileId}): ${e}`
      );
      return []; // エラー時は空配列を返す
    }
  }
*/
  /**
   * IDからファイル/フォルダ名を取得
   */
  private getItemName(id: string): string {
    try {
      const file = DriveApp.getFileById(id);
      return file.getName();
    } catch (e) {
      try {
        const folder = DriveApp.getFolderById(id);
        return folder.getName();
      } catch (e2) {
        return 'Unknown';
      }
    }
  }

  /**
   * シートID(gid)からシートオブジェクトを特定する
   */
  private getSheetById(
    ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
    gid: number
  ): GoogleAppsScript.Spreadsheet.Sheet | null {
    return ss.getSheets().find(s => s.getSheetId() === gid) || null;
  }
}

/**
 * エントリーポイント：特定のドライブの結果を権限調査する
 */
export const runDetailedPermissionAudit_ = () => {
  // 調査したい元データのシート名（ドライブ名）をここで指定します
  const targetSheetName = '調査したいシート名';
  //  new FolderPermissionManager().exportPermissionsBySheetName(targetSheetName);
};
