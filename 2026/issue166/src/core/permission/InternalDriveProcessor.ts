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

import * as Const from '../../common/const';

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

export class ExternalAccountPermissionReport {
  private spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet;

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
   * aro.staff以外のアカウントのメールアドレスが含まれる権限情報を抽出し、新しいシートに出力する
   */
  public extractExternalAccountPermissions(): void {
    try {
      console.log('外部アカウントの権限抽出処理を開始します。');

      if (!this.spreadsheet) {
        throw new Error('スプレッドシートオブジェクトが初期化されていません。');
      }

      // 1. 各シートを取得
      const accountSheet =
        this.spreadsheet.getSheetByName('aro.staff以外のアカウント');
      const permissionSheet = this.spreadsheet.getSheetByName(
        Const.SHEET_NAME.PERMISSION
      );
      const folderSheet = this.spreadsheet.getSheetByName(
        `${Const.SHARED_DRIVE_NAME.INTERNAL}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`
      );

      if (!accountSheet) {
        throw new Error(
          '「aro.staff以外のアカウント」シートが見つかりません。'
        );
      }
      if (!permissionSheet) {
        throw new Error(
          `「${Const.SHEET_NAME.PERMISSION}」シートが見つかりません。`
        );
      }
      if (!folderSheet) {
        throw new Error(
          `「${Const.SHARED_DRIVE_NAME.INTERNAL}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}」シートが見つかりません。`
        );
      }

      // 2. 比較対象のメールアドレスをSetに格納して高速化（1行目からデータ）
      const emailSet = new Set<string>();
      const accountValues = accountSheet
        .getDataRange()
        .getValues() as string[][];

      for (const row of accountValues) {
        const email = row[3]; // D列（インデックス3）
        if (email && typeof email === 'string') {
          // @の前をセットに追加
          const emailPrefix = email.split('@')[0];
          emailSet.add(emailPrefix.trim());
        }
      }
      console.log(
        `比較対象の外部メールアドレスを ${emailSet.size} 件読み込みました。`
      );

      // 3. 権限一覧シートのデータを取得（1行目は見出し）
      const permissionValues = permissionSheet
        .getDataRange()
        .getValues() as string[][];
      if (permissionValues.length <= 1) {
        console.warn(
          `「${Const.SHEET_NAME.PERMISSION}」シートにデータ行が存在しません。`
        );
        return;
      }
      // 3. 「ARO内部のみ共有_フォルダ構成」シートのデータをMap化して高速化
      // A列（インデックス0）をキーにして、行全体のデータを保存します
      const folderMap = new Map<string, string[]>();
      const folderValues = folderSheet.getDataRange().getValues() as string[][];

      // 2行目（インデックス1）からループしてMapに格納（1行目はヘッダーとして後で使用）
      for (let i = 1; i < folderValues.length; i++) {
        const fRow = folderValues[i];
        const keyId = fRow[0]; // A列のID
        if (keyId) {
          folderMap.set(keyId.toString().trim(), fRow);
        }
      }

      // 5. 新しいシートに出力する配列のヘッダー（見出し）を定義
      // 権限一覧のヘッダーの末尾に、フォルダ構成のヘッダー（A列以外）を結合する
      const permHeader = permissionValues[0];
      const folderHeader = folderValues[0] ? folderValues[0].slice(1) : []; // A列(ID)は重複するので除外
      const outputRows: string[][] = [[...permHeader, ...folderHeader]];

      // 6. 権限一覧のデータ行をループして部分一致およびA列の突合を判定
      for (let i = 1; i < permissionValues.length; i++) {
        const row = permissionValues[i];
        const targetText = row[1]; // B列: 外部アカウント文字列
        const permKeyId = row[0]; // A列: 突合用のキーID

        if (targetText && typeof targetText === 'string') {
          let isEmailMatched = false;

          // メールアドレスの部分一致判定
          for (const email of emailSet) {
            if (targetText.includes(email)) {
              isEmailMatched = true;
              break;
            }
          }

          // ① メールアドレスがマッチした場合
          if (isEmailMatched) {
            // ② さらに「フォルダ構成」シートのA列と突合（マージ処理）
            const cleanedKey = permKeyId ? permKeyId.toString().trim() : '';
            const matchedFolderRow = folderMap.get(cleanedKey);

            if (matchedFolderRow) {
              // 一致するデータがあった場合：フォルダ構成のA列（ID）を除いた残りの列を結合
              const folderDataWithoutId = matchedFolderRow.slice(1);
              outputRows.push([...row, ...folderDataWithoutId]);
            } else {
              // 一致するデータがなかった場合：空文字で埋めて列数を合わせる
              const emptyCells = new Array(folderHeader.length).fill('');
              outputRows.push([...row, ...emptyCells]);
            }
          }
        }
      }

      // 5. 新しいシートに出力
      const newSheetName = `外部アカウント権限一覧`;

      this.writeToNewSheet(newSheetName, outputRows);
    } catch (error) {
      console.error('外部アカウント権限抽出処理でエラーが発生しました:', error);
      throw error;
    }
  }

  /**
   * 指定した名前のシートにデータを書き込む
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

export const runInternalDriveExcludeCheck_ = () => {
  new InternalDriveProcessor().executeExcludeCheck();
};

export const runExternalAccountPermissionReport_ = () => {
  new ExternalAccountPermissionReport().extractExternalAccountPermissions();
};
