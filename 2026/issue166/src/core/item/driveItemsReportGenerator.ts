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
 * DriveItemsReportGenerator.ts
 */
import { BaseReport } from '../../baseReport';
import * as Const from '../../common/const';
/**
 * アーカイブされたJSONファイル群からデータを読み込み、
 * 共有ドライブのフォルダ・ファイル階層レポートをスプレッドシートへ出力するクラス。
 * * 基底クラス {@link BaseReport} を継承し、標準的なレポート出力フローを提供します。
 */
class DriveItemsReportGenerator extends BaseReport {
  private targetDriveId: string | null;
  private targetDriveName: string;

  /**
   * DriveItemsReportGenerator のインスタンスを初期化します。
   * スクリプトプロパティから必要な環境設定（対象ドライブIDおよびドライブ名）を読み込みます。
   * * @throws {Error} 必須となる対象ドライブIDまたはドライブ名のスクリプトプロパティが存在しない場合
   */
  constructor() {
    super();
    const props = PropertiesService.getScriptProperties();
    this.targetDriveId = props.getProperty(
      Const.PROPERTY_KEYS.TARGET_SHARED_DRIVE_ID
    );
    if (!this.targetDriveId) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.TARGET_SHARED_DRIVE_ID} が設定されていません。スクリプトプロパティに共有ドライブ設定レポートの対象ドライブIDを設定してください。`
      );
    }
    this.targetDriveName =
      props.getProperty(Const.PROPERTY_KEYS.DRIVE_NAME) || '';
    if (!this.targetDriveName) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.DRIVE_NAME} が設定されていません。`
      );
    }
  }
  /**
   * 共有ドライブのアイテム階層レポートを生成し、スプレッドシートへ出力するメイン処理。
   */
  public generateReport(): void {
    const sheetName = `${this.targetDriveName}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
    const sheet: GoogleAppsScript.Spreadsheet.Sheet = this.initOutputSheet(
      sheetName,
      Const.REPORT_HEADERS.DRIVE_ITEM as string[]
    );
    const data: string[][] = this.getInputData();
    this.addDataToSheet(data, sheet);
  }
  /**
   * アーカイブされた複数のJSONファイルからデータを読み込み、2次元配列のシート用データへ変換して取得します。
   * @returns {string[][]} スプレッドシートにそのまま書き込める2次元配列データ
   * @private
   */
  private getInputData(): string[][] {
    return this.getOutputDataFromJsons<Const.ArchivedItem>(
      Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM,
      this.targetDriveName,
      item => this.mapItemToRow(item)
    );
  }
  /**
   * 1つのアーカイブアイテム（JSONレコード）を、スプレッドシートの1行分のデータ（文字列配列）にマッピングします。
   * 列の順番を変更する場合や、値の型変換を行う場合はこのメソッドを修正します。
   * @param {Const.ArchivedItem} item - JSONから読み込まれたアイテムデータ
   * @returns {string[]} スプレッドシートの各セルに対応する文字列の配列
   * @private
   */
  private mapItemToRow(item: Const.ArchivedItem): string[] {
    return [
      item.id ? String(item.id) : '',
      item.itemType ? String(item.itemType) : '',
      item.parentPath ? String(item.parentPath) : '',
      item.name ? String(item.name) : '',
      item.createdTime ? String(item.createdTime) : '',
      item.modifiedTime ? String(item.modifiedTime) : '',
    ];
  }
}
/**
 * 1.3. 出力処理のエントリーポイント関数。
 * `DriveItemsReportGenerator` のインスタンスを生成し、フォルダ構成レポートを出力します。
 */
export const runReportGeneration_ = () =>
  new DriveItemsReportGenerator().generateReport();
