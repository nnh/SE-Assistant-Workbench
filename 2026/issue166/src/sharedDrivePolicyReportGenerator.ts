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
import { PermissionArchiver } from './permissionArchiver';
import { PermissionReportGenerator } from './permissionReportGenerator';
import { DateUtils } from './utils';

class SharedDrivePolicyReportGenerator extends BaseReport {
  constructor() {
    super(
      Const.PROPERTY_KEYS.POLICY_REPORT_JSON_FOLDER_ID,
      Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
    );
  }
  private getTargetDriveIds(): string[] {
    const props = PropertiesService.getScriptProperties();
    const driveIdsRaw: string =
      props.getProperty(Const.PROPERTY_KEYS.POLICY_REPORT_TARGET_DRIVE_IDS) ||
      '';

    if (!driveIdsRaw) {
      throw new Error(
        '共有ドライブ設定レポートの対象ドライブIDが設定されていません。'
      );
    }

    return driveIdsRaw
      .split(',')
      .map(id => id.trim())
      .filter(id => id !== '');
  }
  /**
   * 1. 【保存フェーズ】
   * プロパティのドライブIDに基づき、APIから共有ドライブの設定を取得してJSONとして保存する
   */
  public fetchAndSaveDriveGet(): void {
    const driveIds: string[] = this.getTargetDriveIds();

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
   * プロパティのドライブIDに基づき、APIからパーミッションを取得する
   */
  public fetchAndSavePermissions(): void {
    const targetDriveIds: string[] = this.getTargetDriveIds();
    const permissionArchiver = new PermissionArchiver();
    targetDriveIds.forEach(driveId => {
      const permissionsData = permissionArchiver.fetchPermissions(driveId);
      const fileName = FileUtils.generateJsonFileName(
        Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION,
        driveId,
        1
      );
      permissionArchiver.saveAsJsonFile(
        fileName,
        permissionsData,
        this.jsonFolder
      );
      console.log(
        `Permissions JSON saved for drive ID ${driveId} as ${fileName}`
      );
    });
  }

  /**
   * 2. 【出力フェーズ】
   * 保存されている最新のJSONファイルを読み込み、スプレッドシートに出力する
   */
  /**
   * パーミッションデータをドライブIDごとに取得する
   * * @description
   * 対象ドライブIDごとに、保存されている最新のJSONファイルを読み込み、パーミッションデータを抽出して返します。
   * 取得したパーミッションデータは、共有ドライブの設定と組み合わせてスプレッドシートに出力する際に使用します。
   * * @private
   * @param targetDriveName
   * @returns
   */
  private getPermissionsDataForDrive(
    targetDriveName: string
  ): GoogleAppsScript.Drive.File[] {
    // 1. JSONファイルをすべて読み込む
    const rawDataList: GoogleAppsScript.Drive.File[] = this.getTargetJsonFiles(
      Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION,
      targetDriveName
    );
    return rawDataList;
  }
  public generateReport(): void {
    const outputDate = DateUtils.getNowStr();
    const sheetName = '共有ドライブ自体の設定';
    const sheet = this.getOutputSheet(
      this.outputSpreadsheet,
      sheetName,
      Const.REPORT_HEADERS.SHARED_DRIVE_POLICY as string[]
    );

    // 共有ドライブの設定
    const allRawData = this.fetchAndCombineJsonData<any>(
      Const.OUTPUT_FILE_NAME.PREFIX.SHARED_DRIVE_POLICY,
      'ALL_TARGETS'
    );
    const targetDriveIds: string[] = this.getTargetDriveIds();

    // 共有ドライブのメンバー
    const perGenerator = new PermissionReportGenerator(
      Const.PROPERTY_KEYS.JSON_FOLDER_ID,
      Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
    );
    const index = {
      displayName: 2,
      emailAddress: 4,
      role: 3,
    };
    const allPermissionsData = targetDriveIds.map(id => {
      const targetJson: GoogleAppsScript.Drive.File[] =
        this.getPermissionsDataForDrive(id);
      const members: string[][] = perGenerator.editOutputData(targetJson);
      // 必要な要素だけ抽出して整形
      const res = members.map(member => [
        id,
        `${member[Const.INDEX.PERMISSION_ARRAY.DISPLAY_NAME]}(${member[Const.INDEX.PERMISSION_ARRAY.EMAIL_ADDRESS]})：${member[Const.INDEX.PERMISSION_ARRAY.ROLE]}`,
      ]);
      return res;
    });

    // 2. 独自のデータ整形ロジック（1要素 -> 複数行への展開）
    const outputData: string[][] = [];

    allRawData.forEach(drive => {
      // エラーデータのハンドリング
      if (drive.error) {
        outputData.push([drive.id, drive.name, `取得失敗: ${drive.error}`]);
        return;
      }
      const permission = allPermissionsData.find(p => p[0][0] === drive.id);
      if (permission) {
        permission.forEach(p => {
          outputData.push([p[0], drive.name, p[1]]);
        });
      } else {
        outputData.push([drive.id, drive.name, 'メンバー情報の取得に失敗']);
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
    if (outputData.length === 0) {
      console.log('出力するデータがありません。');
      return;
    }
    // 出力日時を最後の列に追加
    outputData.forEach(row => row.push(outputDate));

    this.addDataToSheet(outputData, sheet);
    console.log(
      `共有ドライブの設定レポートを生成しました。出力行数: ${outputData.length}`
    );
  }
}

export const archiveSharedDrivePoliciesDriveGet_ = () =>
  new SharedDrivePolicyReportGenerator().fetchAndSaveDriveGet();
export const archiveSharedDrivePoliciesPermissions_ = () =>
  new SharedDrivePolicyReportGenerator().fetchAndSavePermissions();
export const sharedDrivePolicyReportGenerator_ = () =>
  new SharedDrivePolicyReportGenerator().generateReport();
