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
import { DriveApiService } from './driveApiService';
import * as Const from './const';

class SharedDrivePolicyReportGenerator extends BaseReport {
  constructor() {
    super();
  }

  /**
   * プロパティから指定された共有ドライブの設定情報を取得し、出力する
   */
  public generateFromProperty(): void {
    const props = PropertiesService.getScriptProperties();
    // 明示的な名前のプロパティから取得
    const driveIdsRaw: string =
      props.getProperty(Const.PROPERTY_KEYS.POLICY_REPORT_TARGET_DRIVE_IDS) ||
      '';

    if (!driveIdsRaw) {
      console.warn(
        `プロパティ「${Const.PROPERTY_KEYS.POLICY_REPORT_TARGET_DRIVE_IDS}」が空です。`
      );
      return;
    }

    const driveIds = driveIdsRaw
      .split(',')
      .map(id => id.trim())
      .filter(id => id !== '');
    this.executeReport(driveIds);
  }

  /**
   * 実際のレポート生成メインロジック
   */
  private executeReport(driveIds: string[]): void {
    const sheetName = '共有ドライブ自体の設定';
    let sheet = this.outputSpreadsheet.getSheetByName(sheetName);

    if (!sheet) {
      sheet = this.outputSpreadsheet.insertSheet(sheetName);
    } else {
      sheet.clear();
    }

    const headers = Const.REPORT_HEADERS.SHARED_DRIVE_POLICY;

    const rows = driveIds.map(id => {
      try {
        const drive = DriveApiService.fetchDriveInfo(id);
        const res = drive.restrictions;

        return {
          id: drive.id,
          name: drive.name,
          restrictions: [
            res.domainUsersOnly
              ? '組織外ユーザーにファイルへのアクセスを許可しない'
              : '組織外ユーザーにファイルへのアクセスを許可する',
            res.driveMembersOnly
              ? '共有ドライブのメンバー以外のユーザーにファイルへのアクセスを許可しない'
              : '共有ドライブのメンバー以外のユーザーにファイルへのアクセスを許可する',
            res.sharingFoldersRequiresOrganizerPermission
              ? 'コンテンツ管理者にフォルダの共有を許可しない（フォルダを共有できるのは管理者のみ）'
              : 'コンテンツ管理者にフォルダの共有を許可する（フォルダを共有できるのは管理者とコンテンツ管理者）',
            res.downloadRestriction?.restrictedForWriters !== undefined
              ? res.downloadRestriction.restrictedForWriters
                ? '投稿者とコンテンツ管理者に対してダウンロードとコピーが制限されている'
                : '投稿者とコンテンツ管理者に対してダウンロードとコピーが制限されていない'
              : '',
            res.downloadRestriction?.restrictedForReaders !== undefined
              ? res.downloadRestriction.restrictedForReaders
                ? '閲覧者（コメント可）と閲覧者に対してダウンロードとコピーが制限されている'
                : '閲覧者（コメント可）と閲覧者に対してダウンロードとコピーが制限されていない'
              : '',
            res.copyRequiresWriterPermission
              ? 'この共有ドライブ内のファイルをコピー、印刷、ダウンロードするオプションを閲覧者と閲覧者（コメント可）に対して無効にする'
              : 'この共有ドライブ内のファイルをコピー、印刷、ダウンロードするオプションを閲覧者と閲覧者（コメント可）に対して無効にしない',
            res.adminManagedRestrictions
              ? '共有ドライブの制限を変更するために管理者権限が必要'
              : '共有ドライブの制限を変更するために管理者権限が必要ではない',
          ].filter(value => value !== ''),
        };
      } catch (e) {
        console.error(`ID: ${id} の取得に失敗: ${e}`);
        return { id, name: '取得失敗/権限なし', restrictions: ['-'] };
      }
    });

    // データ整形
    const outputData: string[][] = rows
      .map(row => {
        const res = row.restrictions.map(value => [row.id, row.name, value]);
        return res;
      })
      .flat();

    // シートへの書き出しと整形
    sheet
      .getRange(1, 1, 1, headers.length)
      .setValues([headers] as string[][])
      .setFontWeight('bold')
      .setBackground('#f3f3f3');
    if (outputData.length > 0) {
      sheet
        .getRange(2, 1, outputData.length, headers.length)
        .setValues(outputData);
    }

    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, headers.length);
    console.log(`${sheetName} を更新しました。対象件数: ${driveIds.length}件`);
  }
}
export const sharedDrivePolicyReportGenerator_ = (): void =>
  new SharedDrivePolicyReportGenerator().generateFromProperty();
