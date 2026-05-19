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
 * 内部のみ共有ドライブの特別処理をまとめたクラス
 */

import * as Const from './const';

class InternalDriveProcessor {
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet | null = null;

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
    this.spreadsheet = SpreadsheetApp.openById(spreadSheetId);
    if (!this.spreadsheet) {
      throw new Error(
        `スプレッドシートID ${spreadSheetId} のスプレッドシートが見つかりません。`
      );
    }
  }

  /**
   * 内部用共有ドライブのフォルダ構成シートに対して、権限取得対象外の判定を行う
   */
  public executeExcludeCheck(): void {
    try {
      // 1. 対象のシートを取得
      if (!this.spreadsheet) {
        throw new Error('スプレッドシートオブジェクトが初期化されていません。');
      }
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
        throw new Error('対象のシートが見つかりません');
      }

      // 2. 除外パスのリスト（マスタ）を作成
      const excludePaths: string[] = [];
      if (excludeSheet) {
        const excludeValues = excludeSheet
          .getDataRange()
          .getValues() as string[][];
        for (const row of excludeValues) {
          const path = row[0]; // A列
          if (path && path.trim() !== '') {
            excludePaths.push(path.trim());
          }
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

      // 4. データ行をループして判定（G列用の配列を作成）
      // 1行目はヘッダーを想定してそのまま保持、または新しく設定
      const outputGColumn: string[][] = [['取得対象外判定']]; // G列のヘッダー名（適宜変更してください）

      // 2行目（インデックス1）からデータ行をループ
      for (let i = 1; i < folderValues.length; i++) {
        const row = folderValues[i];
        const parentPath = row[2]; // C列（インデックス2）: 親フォルダパス

        let isExcluded = false;

        if (parentPath) {
          // 除外パスのいずれかに「前方一致」するかを判定
          // 例: excludePath が ".../ test /" で、parentPath が ".../ test / subfolder" ならヒットする
          for (const excludePath of excludePaths) {
            if (parentPath.startsWith(excludePath)) {
              isExcluded = true;
              break; // 1つでもヒットしたら内側のループを抜ける
            }
          }
        }

        // ヒットしたら「対象外」、そうでなければ「空文字（対象）」とする
        outputGColumn.push([isExcluded ? '取得対象外' : '']);
      }

      // 5. G列（A列から数えて7番目）に一括書き込み
      // getRange(開始行, 開始列, 行数, 列数)
      const targetRange = folderSheet.getRange(1, 7, outputGColumn.length, 1);
      targetRange.setValues(outputGColumn);

      console.log('対象外判定の書き込みが正常に完了しました。');
    } catch (error) {
      console.error('内部共有フォルダ判定処理でエラーが発生しました:', error);
      throw error;
    }
  }
}

export const runInternalDriveExcludeCheck = () => {
  new InternalDriveProcessor().executeExcludeCheck();
};
