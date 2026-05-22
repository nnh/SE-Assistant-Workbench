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
 * 組織外のアカウント（外部メールアドレスなど）が含まれる権限情報を抽出し、
 * フォルダ構成情報とマージ（突合）してレポートシートを自動生成するクラス。
 */
export class ExternalAccountPermissionReport {
  /** 出力先スプレッドシートのオブジェクト */
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

  /**
   * ExternalAccountPermissionReport のインスタンスを初期化します。
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

    this.spreadsheet = SpreadsheetApp.openById(spreadSheetId);
  }

  /**
   * 特定のホワイトリスト（aro.staff以外のアカウント）に含まれる外部メールアドレスの権限情報を抽出し、
   * フォルダ構成データと突合させたマージレポートを「外部アカウント権限一覧」シートに出力します。
   * @throws {Error} 処理に必要なソースシートが1つでも見つからない場合
   */
  public extractExternalAccountPermissions(): void {
    console.log('外部アカウントの権限抽出処理を開始します。');

    // 1. 各ソースシートをスプレッドシートから取得
    const accountSheet =
      this.spreadsheet.getSheetByName('aro.staff以外のアカウント');
    const permissionSheet = this.spreadsheet.getSheetByName(
      Const.SHEET_NAME.PERMISSION
    );

    const folderSheetName = `${Const.SHARED_DRIVE_NAME.INTERNAL}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
    const folderSheet = this.spreadsheet.getSheetByName(folderSheetName);

    if (!accountSheet) {
      throw new Error('「aro.staff以外のアカウント」シートが見つかりません。');
    }
    if (!permissionSheet) {
      throw new Error(
        `「${Const.SHEET_NAME.PERMISSION}」シートが見つかりません。`
      );
    }
    if (!folderSheet) {
      throw new Error(`「${folderSheetName}」シートが見つかりません。`);
    }

    // 2. 比較対象のメールアドレスをSetに格納して高速化（O(1)検索用）
    const emailSet = new Set<string>();
    const accountValues = accountSheet.getDataRange().getValues() as string[][];
    const COLUMN_INDEX_ACCOUNT_EMAIL = 3; // D列（メールアドレス）のインデックス番号
    // ヘッダーなしのため一行目から処理する
    for (const row of accountValues) {
      const email = row[COLUMN_INDEX_ACCOUNT_EMAIL];
      if (email && typeof email === 'string') {
        // @マークより前の文字列（ローカルパート）を抽出してインデックス化
        const emailPrefix = email.split('@')[0];
        emailSet.add(emailPrefix.trim());
      }
    }
    console.log(
      `比較対象の外部メールアドレスを ${emailSet.size} 件読み込みました。`
    );

    // 3. 権限一覧シートのデータを取得
    const permissionValues = permissionSheet
      .getDataRange()
      .getValues() as string[][];
    if (permissionValues.length <= 1) {
      console.warn(
        `「${Const.SHEET_NAME.PERMISSION}」シートにデータ行が存在しません。`
      );
      return;
    }

    // 4. 「フォルダ構成」シートのデータをMap化して突合処理を高速化
    const folderMap = new Map<string, string[]>();
    const folderValues = folderSheet.getDataRange().getValues() as string[][];
    const COLUMN_INDEX_FOLDER_ID = 0; // A列（アイテムID）のインデックス番号

    // 2行目からループしてIDをキーとしたMapに格納
    for (let i = 1; i < folderValues.length; i++) {
      const fRow = folderValues[i];
      const keyId = fRow[COLUMN_INDEX_FOLDER_ID];
      if (keyId) {
        folderMap.set(keyId.toString().trim(), fRow);
      }
    }

    // 5. 新しいシートに出力する配列のヘッダー（見出し）を定義
    const permHeader = permissionValues[0];
    const folderHeader = folderValues[0].slice(1); // A列(ID)は重複するので除外
    const outputRows: string[][] = [[...permHeader, ...folderHeader]];

    const COLUMN_INDEX_PERM_KEY_ID = 0; // 権限シートのA列（突合キーID）
    const COLUMN_INDEX_PERM_TEXT = 1; // 権限シートのB列（外部アカウント文字列）

    // 6. 権限一覧のデータ行をループして部分一致およびIDの突合（マージ）を判定
    for (let i = 1; i < permissionValues.length; i++) {
      const row = permissionValues[i];
      const targetText = row[COLUMN_INDEX_PERM_TEXT];
      const permKeyId = row[COLUMN_INDEX_PERM_KEY_ID];

      if (targetText && typeof targetText === 'string') {
        let isEmailMatched = false;

        // アカウント文字列の中にマスタのメールプレフィックスが含まれるか部分一致判定
        for (const email of emailSet) {
          if (targetText.includes(email)) {
            isEmailMatched = true;
            break;
          }
        }

        // メールアドレスがマッチした場合のみマージ処理へ進む
        if (isEmailMatched) {
          const cleanedKey = permKeyId ? permKeyId.toString().trim() : '';
          const matchedFolderRow = folderMap.get(cleanedKey);

          if (matchedFolderRow) {
            // 一致するフォルダ構成データがあった場合：A列(ID)を除いた残りの列データを右側に結合
            const folderDataWithoutId = matchedFolderRow.slice(1);
            outputRows.push([...row, ...folderDataWithoutId]);
          } else {
            // 一致するデータがなかった場合：空文字で埋めてセル列数を合わせる
            const emptyCells = new Array(folderHeader.length).fill('');
            outputRows.push([...row, ...emptyCells]);
          }
        }
      }
    }

    // 7. 新しいシートへの書き出しを実行
    const newSheetName = `外部アカウント権限一覧`;
    this.writeToNewSheet(newSheetName, outputRows);
  }

  /**
   * 指定した名前のシートに対して、2次元配列データを一括上書き出力します。
   * シートが既に存在する場合は内容を一度クリアし、存在しない場合は新規に作成します。
   * @param {string} sheetName - 出力先シートの名前
   * @param {string[][]} values - 書き込む2次元配列データ
   * @private
   */
  private writeToNewSheet(sheetName: string, values: string[][]): void {
    let targetSheet = this.spreadsheet.getSheetByName(sheetName);

    if (!targetSheet) {
      targetSheet = this.spreadsheet.insertSheet(sheetName);
    } else {
      targetSheet.clearContents();
    }

    if (values.length > 0 && values[0].length > 0) {
      targetSheet
        .getRange(1, 1, values.length, values[0].length)
        .setValues(values);

      console.log(
        `シート「${sheetName}」に ${values.length - 1} 件の抽出データを書き込みました。`
      );
    }
  }
}

/**
 * 3.1. 抽出処理のエントリーポイント関数。
 * `ExternalAccountPermissionReport` のインスタンスを生成し、外部アカウント権限の抽出を実行します。
 */
export const runExternalAccountPermissionReport_ = (): void => {
  new ExternalAccountPermissionReport().extractExternalAccountPermissions();
};
