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

import * as Const from '../../common/const';

/**
 * 内部用共有ドライブに対して、特定の親フォルダ配下を
 * 権限取得対象外（監査スキップ対象）として判定・マーク処理を行うクラス。
 */
class InternalDriveExcludeChecker {
  /** 出力先スプレッドシートのオブジェクト */
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

  /**
   * InternalDriveExcludeChecker のインスタンスを初期化します。
   * スクリプトプロパティから出力先スプレッドシートIDを読み込み、オブジェクトを確立します。
   * @throws {Error} スプレッドシートIDが未設定、または対象ファイルが開けない場合
   */
  constructor() {
    const props = PropertiesService.getScriptProperties();
    const spreadSheetId = props.getProperty(
      Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
    );

    if (!spreadSheetId) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID} が設定されていません。スクリプトプロパティに出力先スプレッドシートIDを設定してください。`
      );
    }

    const ss = SpreadsheetApp.openById(spreadSheetId);
    if (!ss) {
      throw new Error(
        `スプレッドシートID ${spreadSheetId} のスプレッドシートが見つかりません。`
      );
    }
    this.spreadsheet = ss;
  }

  /**
   * 内部用共有ドライブのフォルダ構成シートに対して、マスタの条件に基づき権限取得対象外の判定を行い、G列へ一括書き込みします。
   * @throws {Error} 処理に必要なシート（マスタシートやフォルダ構成シート）が見つからない場合
   */
  public executeExcludeCheck(): void {
    try {
      // 1. 各種対象シートを取得
      const excludeSheet =
        this.spreadsheet.getSheetByName('権限取得対象外親フォルダパス');
      if (!excludeSheet) {
        throw new Error(
          '「権限取得対象外親フォルダパス」シートが見つかりません。'
        );
      }

      const folderSheetName = `${Const.SHARED_DRIVE_NAME.INTERNAL}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
      const folderSheet = this.spreadsheet.getSheetByName(folderSheetName);
      if (!folderSheet) {
        throw new Error(`対象のシート「${folderSheetName}」が見つかりません。`);
      }

      // 2. 除外パスのリスト（マスタ）を作成
      const excludePaths: string[] = [];
      const excludeValues = excludeSheet
        .getDataRange()
        .getValues() as string[][];
      for (const row of excludeValues) {
        const path = row[0]; // A列
        if (path && path.trim() !== '') {
          excludePaths.push(path.trim());
        }
      }
      console.log(
        `除外対象として ${excludePaths.length} 件のパスを読み込みました。`
      );

      // 3. フォルダ構成シートのデータを取得
      const folderRange = folderSheet.getDataRange();
      const folderValues = folderRange.getValues() as string[][];

      if (folderValues.length <= 1) {
        console.warn(`${folderSheetName}シートにデータ行が存在しません。`);
        return;
      }

      // 4. データ行をループして前方一致判定（G列用の書き込み配列を作成）
      const outputGColumn: string[][] = [['取得対象外判定']]; // G列ヘッダー

      const COLUMN_INDEX_PARENT_PATH = 2; // C列（親フォルダパス）のインデックス番号

      // 2行目からデータ行をループ走査
      for (let i = 1; i < folderValues.length; i++) {
        const row = folderValues[i];
        const parentPath = row[COLUMN_INDEX_PARENT_PATH];

        // マスタ内の除外パスのいずれかに「前方一致」するかを判定
        const isExcluded = parentPath
          ? excludePaths.some(excludePath => parentPath.startsWith(excludePath))
          : false;

        outputGColumn.push([isExcluded ? '取得対象外' : '']);
      }

      // 5. G列（A列から数えて7番目）のセル範囲へ一括書き込み
      const TARGET_COLUMN_NUMBER = 7; // G列
      const targetRange = folderSheet.getRange(
        1,
        TARGET_COLUMN_NUMBER,
        outputGColumn.length,
        1
      );
      targetRange.setValues(outputGColumn);

      console.log('対象外判定の書き込みが正常に完了しました。');
    } catch (error) {
      console.error('内部共有フォルダ判定処理でエラーが発生しました:', error);
      throw error;
    }
  }
}

/**
 * 2.1. 判定処理のエントリーポイント関数。
 * `InternalDriveExcludeChecker` のインスタンスを生成し、除外チェック処理を実行します。
 */
export const runInternalDriveExcludeCheck_ = (): void => {
  new InternalDriveExcludeChecker().executeExcludeCheck();
};
