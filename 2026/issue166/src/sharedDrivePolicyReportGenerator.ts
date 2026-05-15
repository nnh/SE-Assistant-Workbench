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
import { FileUtils } from './fileUtils';

class SharedDrivePolicyReportGenerator extends BaseReport {
  constructor() {
    super();
  }

  /**
   * 1. 【保存フェーズ】
   * プロパティのドライブIDに基づき、APIからデータを取得してJSONとして保存する
   */
  public fetchAndSaveDriveGet(): void {
    const props = PropertiesService.getScriptProperties();
    const driveIdsRaw: string =
      props.getProperty(Const.PROPERTY_KEYS.POLICY_REPORT_TARGET_DRIVE_IDS) ||
      '';

    if (!driveIdsRaw) {
      console.warn('対象ドライブIDが設定されていません。');
      return;
    }

    const driveIds = driveIdsRaw
      .split(',')
      .map(id => id.trim())
      .filter(id => id !== '');

    // データの取得
    const rawResults = driveIds.map(id => {
      try {
        const drive = DriveApiService.fetchDriveInfo(id);
        return {
          id: drive.id,
          name: drive.name,
          restrictions: drive.restrictions,
          capabilities: drive.capabilities,
          fetchedAt: new Date().toISOString(),
        };
      } catch (e) {
        return { id, name: '取得失敗', error: String(e) };
      }
    });

    // JSONファイルとして保存
    const fileName = FileUtils.generateJsonFileName(
      Const.OUTPUT_FILE_NAME.PREFIX.SHARED_DRIVE_POLICY,
      'ALL_TARGETS',
      1
    );
    this.jsonFolder.createFile(
      fileName,
      JSON.stringify(rawResults),
      MimeType.PLAIN_TEXT
    );
    console.log(`JSONを保存しました: ${fileName}`);
  }

  /**
   * 2. 【出力フェーズ】
   * 保存されている最新のJSONファイルを読み込み、スプレッドシートに出力する
   */
  public generateReport(): void {
    const sheetName = '共有ドライブ自体の設定';
    let sheet = this.outputSpreadsheet.getSheetByName(sheetName);
    if (!sheet) sheet = this.outputSpreadsheet.insertSheet(sheetName);
    sheet.clear();

    const headers = Const.REPORT_HEADERS.SHARED_DRIVE_POLICY;

    const allRawData = this.fetchAndCombineJsonData<any>(
      Const.OUTPUT_FILE_NAME.PREFIX.SHARED_DRIVE_POLICY,
      'ALL_TARGETS'
    );

    // 2. 独自のデータ整形ロジック（1要素 -> 複数行への展開）
    const outputData: string[][] = [];

    allRawData.forEach(drive => {
      // エラーデータのハンドリング
      if (drive.error) {
        outputData.push([drive.id, drive.name, `取得失敗: ${drive.error}`]);
        return;
      }

      const res = drive.restrictions;

      // 出力したいメッセージのリストを作成
      const messages = [
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
      ].filter(msg => msg !== '');

      // 1つのドライブデータから、メッセージの数だけ行（string[]）を生成して追加
      messages.forEach(msg => {
        outputData.push([
          String(drive.id || ''),
          String(drive.name || ''),
          msg,
        ]);
      });
    });

    // 3. シートへの一括書き出し
    if (outputData.length > 0) {
      sheet
        .getRange(1, 1, 1, headers.length)
        .setValues([headers] as string[][])
        .setFontWeight('bold');
      sheet
        .getRange(2, 1, outputData.length, headers.length)
        .setValues(outputData);

      sheet.setFrozenRows(1);
      sheet.autoResizeColumns(1, headers.length);
    }
  }
}

export const archiveSharedDrivePoliciesDriveGet_ = () =>
  new SharedDrivePolicyReportGenerator().fetchAndSaveDriveGet();
export const sharedDrivePolicyReportGenerator_ = () =>
  new SharedDrivePolicyReportGenerator().generateReport();
