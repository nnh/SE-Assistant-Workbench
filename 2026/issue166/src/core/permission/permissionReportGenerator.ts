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

import { BaseReport } from '../../baseReport';
import * as Const from '../../common/const';

/**
 * アーカイブされた詳細権限JSONファイル群を解析・編集し、
 * 共有ドライブの総合アクセス権限レポートシートを生成・マージ出力するクラス。
 * * 基底クラス {@link BaseReport} を継承し、既存レコードの差分更新（アップデート）に対応した
 * 高度なレポート出力フローを提供します。
 */
export class PermissionReportGenerator extends BaseReport {
  // 1バッチあたりの処理ファイル数
  private static readonly BATCH_SIZE = 200;

  // Step2のエントリーポイント関数名（トリガー登録に使用）
  private static readonly STEP2_FUNCTION_NAME =
    'runPermissionReportGenerationStep2_';

  /**
   * PermissionReportGenerator のインスタンスを初期化します。
   * @param {string} jsonFolderKey - 保存先フォルダIDを取得するためのキー名
   * @param {string} outputSpreadsheetKey - 出力先スプレッドシートIDを取得するためのキー名
   */
  constructor(jsonFolderKey: string, outputSpreadsheetKey: string) {
    super(jsonFolderKey, outputSpreadsheetKey);
  }

  /**
   * 共有ドライブのアクセス権限レポートを生成し、スプレッドシートへ出力・マージします。
   */
  public generateReport(): void {
    const sheetName = Const.SHEET_NAME.PERMISSION;

    let sheet = this.outputSpreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = this.outputSpreadsheet.insertSheet(sheetName);
    }

    const data = this.getInputData();
    const outputData = this.editOutputData(data);

    const updateIds: Set<string> = new Set();
    const resultRows = this.formatReportRows(outputData, updateIds);

    const saveValues = sheet.getDataRange().getValues() as string[][];
    const combinedValues = this.mergeWithExistingData(
      saveValues,
      resultRows,
      updateIds
    );

    this.setHeader(sheet, Const.REPORT_HEADERS.PERMISSION as string[]);
    this.addDataToSheet(combinedValues, sheet);
  }

  /**
   * 「作業用_権限出力対象IDリスト」シートのA列に記載されたファイルIDをもとに、
   * 対応するJSONファイルを読み込み、権限一覧シートへ出力・マージします。
   * @description
   * シートのA1セルから連続してIDを記載してください（ヘッダー行なし）。
   * 出力先は通常の権限一覧シートと同じです。既存データとのマージも行います。
   */
  public generateReportFromSpecifiedIds(): void {
    const idSheet = this.outputSpreadsheet.getSheetByName(
      Const.SHEET_NAME.PERMISSION_TARGET_ID_LIST
    );
    if (!idSheet) {
      throw new Error(
        `シート「${Const.SHEET_NAME.PERMISSION_TARGET_ID_LIST}」が見つかりません。A列にファイルIDを記載したシートを作成してください。`
      );
    }

    const lastRow = idSheet.getLastRow();
    if (lastRow === 0) {
      throw new Error(
        `シート「${Const.SHEET_NAME.PERMISSION_TARGET_ID_LIST}」にIDが記載されていません。`
      );
    }

    const specifiedIds: Set<string> = new Set(
      idSheet
        .getRange('A1:A' + lastRow)
        .getValues()
        .flat()
        .filter(
          (id: unknown): id is string =>
            typeof id === 'string' && id.trim() !== ''
        )
        .map((id: string) => id.trim())
    );

    const prefix = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_`;
    const fileMap = new Map<string, GoogleAppsScript.Drive.File>();
    const files = this.jsonFolder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      if (fileName.startsWith(prefix) && fileName.endsWith('.json')) {
        const itemId = fileName.slice(prefix.length, -'.json'.length);
        if (specifiedIds.has(itemId)) {
          const existing = fileMap.get(fileName);
          if (!existing || file.getLastUpdated() > existing.getLastUpdated()) {
            fileMap.set(fileName, file);
          }
        }
      }
    }

    const targetFiles = Array.from(fileMap.values());
    const outputData = this.editOutputData(targetFiles);
    const updateIds: Set<string> = new Set();
    const resultRows = this.formatReportRows(outputData, updateIds);

    const sheetName = Const.SHEET_NAME.PERMISSION;
    let outputSheet = this.outputSpreadsheet.getSheetByName(sheetName);
    if (!outputSheet) {
      outputSheet = this.outputSpreadsheet.insertSheet(sheetName);
    }

    // シートが空の場合のみヘッダーを設定する（clearContents を伴う setHeader は呼ばない）
    const isEmptySheet =
      outputSheet.getLastRow() === 0 ||
      outputSheet
        .getDataRange()
        .getValues()[0]
        .every(cell => cell === '');
    if (isEmptySheet) {
      this.setHeader(outputSheet, Const.REPORT_HEADERS.PERMISSION as string[]);
    }

    // 指定IDの既存行を除外した上で追記する
    const saveValues = outputSheet.getDataRange().getValues() as string[][];
    const filteredValues = saveValues.slice(1).filter(row => {
      const fileId = row[0];
      return !updateIds.has(fileId);
    });
    outputSheet
      .getDataRange()
      .offset(1, 0, Math.max(saveValues.length - 1, 1))
      .clearContent();
    this.addDataToSheet([...resultRows, ...filteredValues], outputSheet);
  }

  /**
   * バッチ処理 Step1：対象ファイルのDrive IDリストを収集し、PropertiesServiceに保存します。
   * JSONファイルの読み込みは行わず、フォルダ走査のみを実施します。
   * 完了後、Step2を実行するためのタイムトリガーを登録します。
   */
  public generateReportStep1(): void {
    const fileIds = this.collectTargetFileIds();
    const props = PropertiesService.getScriptProperties();
    props.setProperty(
      Const.PROPERTY_KEYS.PERMISSION_BATCH_FILE_IDS,
      JSON.stringify(fileIds)
    );
    props.setProperty(Const.PROPERTY_KEYS.PERMISSION_BATCH_INDEX, '0');

    ScriptApp.newTrigger(PermissionReportGenerator.STEP2_FUNCTION_NAME)
      .timeBased()
      .after(60 * 1000)
      .create();

    console.log(
      `Step1 完了: 対象ファイル ${fileIds.length} 件。Step2 トリガーを登録しました。`
    );
  }

  /**
   * バッチ処理 Step2：PropertiesServiceに保存されたファイルIDリストから1バッチ分を処理します。
   * 処理完了後、残りがある場合は次バッチのトリガーを登録します。
   * 全バッチ完了時はPropertiesServiceの進捗データを削除します。
   */
  public generateReportStep2(): void {
    // 前回登録した自分自身のトリガーを削除
    this.deletePendingTriggers(PermissionReportGenerator.STEP2_FUNCTION_NAME);

    const props = PropertiesService.getScriptProperties();
    const fileIdsJson = props.getProperty(
      Const.PROPERTY_KEYS.PERMISSION_BATCH_FILE_IDS
    );
    const batchIndexStr = props.getProperty(
      Const.PROPERTY_KEYS.PERMISSION_BATCH_INDEX
    );

    if (!fileIdsJson || batchIndexStr === null) {
      throw new Error(
        'Step1 が完了していません。先に generateReportStep1 を実行してください。'
      );
    }

    const allFileIds: string[] = JSON.parse(fileIdsJson);
    const batchIndex = parseInt(batchIndexStr, 10);
    const start = batchIndex * PermissionReportGenerator.BATCH_SIZE;
    const end = start + PermissionReportGenerator.BATCH_SIZE;
    const batchFileIds = allFileIds.slice(start, end);

    const sheetName = Const.SHEET_NAME.PERMISSION;
    let sheet = this.outputSpreadsheet.getSheetByName(sheetName);
    if (!sheet) {
      sheet = this.outputSpreadsheet.insertSheet(sheetName);
    }

    const files = batchFileIds.map(id => DriveApp.getFileById(id));
    const outputData = this.editOutputData(files);
    const updateIds: Set<string> = new Set();
    const resultRows = this.formatReportRows(outputData, updateIds);
    const saveValues = sheet.getDataRange().getValues() as string[][];
    const combinedValues = this.mergeWithExistingData(
      saveValues,
      resultRows,
      updateIds
    );

    this.setHeader(sheet, Const.REPORT_HEADERS.PERMISSION as string[]);
    this.addDataToSheet(combinedValues, sheet);

    if (end < allFileIds.length) {
      props.setProperty(
        Const.PROPERTY_KEYS.PERMISSION_BATCH_INDEX,
        String(batchIndex + 1)
      );
      ScriptApp.newTrigger(PermissionReportGenerator.STEP2_FUNCTION_NAME)
        .timeBased()
        .after(60 * 1000)
        .create();
      console.log(
        `バッチ ${batchIndex + 1} 完了 (${end}/${allFileIds.length} 件)。次のバッチトリガーを登録しました。`
      );
    } else {
      props.deleteProperty(Const.PROPERTY_KEYS.PERMISSION_BATCH_FILE_IDS);
      props.deleteProperty(Const.PROPERTY_KEYS.PERMISSION_BATCH_INDEX);
      console.log(`全バッチ完了 (${allFileIds.length} 件)。`);
    }
  }

  /**
   * 指定した関数名で登録されているトリガーをすべて削除します。
   * @param {string} functionName - 削除対象の関数名
   * @private
   */
  private deletePendingTriggers(functionName: string): void {
    ScriptApp.getProjectTriggers()
      .filter(t => t.getHandlerFunction() === functionName)
      .forEach(t => ScriptApp.deleteTrigger(t));
  }

  /**
   * 処理対象とするJSONファイルを取得します。
   * * @description
   * ファイル名の形式は「permission_${FileId}.json」とし、拡張子がJSONであることを条件に抽出します。
   * 「&{ドライブ名}_フォルダ構成」シートのA列にあるファイルIDに存在するFileIdのJSONファイルのみを対象とします。
   * 取得したファイルは、パーミッション情報の出力に使用します。
   * * @private
   * @returns {GoogleAppsScript.Drive.File[]} 処理対象のJSONファイルの配列
   */
  private getInputData(): GoogleAppsScript.Drive.File[] {
    return this.buildTargetFileMap().map(([, file]) => file);
  }

  /**
   * バッチ処理用：対象JSONファイルのDrive IDリストを収集します。
   * JSONファイルの読み込みは行わず、フォルダ走査のみを実施します。
   * @returns {string[]} 処理対象ファイルのDrive IDの配列
   * @private
   */
  private collectTargetFileIds(): string[] {
    return this.buildTargetFileMap().map(([, file]) => file.getId());
  }

  /**
   * フォルダシートとJSONフォルダを照合し、処理対象ファイルのマップを構築します。
   * @returns {[string, GoogleAppsScript.Drive.File][]} [ファイル名, Fileオブジェクト] のエントリ配列
   * @private
   */
  private buildTargetFileMap(): [string, GoogleAppsScript.Drive.File][] {
    const targetDriveName = PropertiesService.getScriptProperties().getProperty(
      Const.PROPERTY_KEYS.DRIVE_NAME
    );
    if (!targetDriveName) {
      throw new Error(
        `プロパティ ${Const.PROPERTY_KEYS.DRIVE_NAME} が設定されていません。スクリプトプロパティに対象共有ドライブ名を設定してください。`
      );
    }
    const folderSheetName = `${targetDriveName}_${Const.OUTPUT_FILE_NAME.PREFIX.DRIVE_ITEM}`;
    const folderSheet = this.outputSpreadsheet.getSheetByName(folderSheetName);
    if (!folderSheet) {
      throw new Error(`シート「${folderSheetName}」が見つかりません。`);
    }
    const targetFileIds: string[] = folderSheet
      .getRange('A2:A' + folderSheet.getLastRow())
      .getValues()
      .flat()
      .filter(
        (id: unknown): id is string =>
          typeof id === 'string' && id.trim() !== ''
      )
      .map((id: string) => id.trim());
    const targetFileIdSet: Set<string> = new Set(targetFileIds);
    const files = this.jsonFolder.getFiles();

    const prefix = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_`;
    const fileMap = new Map<string, GoogleAppsScript.Drive.File>();
    while (files.hasNext()) {
      const file = files.next();
      const fileName = file.getName();
      if (fileName.startsWith(prefix) && fileName.endsWith('.json')) {
        const itemId = fileName.slice(prefix.length, -'.json'.length);
        if (targetFileIdSet.has(itemId)) {
          const existing = fileMap.get(fileName);
          if (!existing || file.getLastUpdated() > existing.getLastUpdated()) {
            fileMap.set(fileName, file);
          }
        }
      }
    }

    return Array.from(fileMap.entries());
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
          (
            item
          ): item is { fileName: string; data: Const.PermissionResponse } =>
            item !== null
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
            item.deleted != null ? String(item.deleted) : '',
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

  /**
   * 展開された生データ配列を、レポート表示用の整形済み行データに変換します。
   * @param {string[][]} outputData - editOutputData から取得した生データの配列
   * @param {Set<string>} updateIds - 更新対象のファイルIDを蓄積するための参照用Setオブジェクト
   * @returns {string[][]} レポートシート用のデータ配列
   * @private
   */
  private formatReportRows(
    outputData: string[][],
    updateIds: Set<string>
  ): string[][] {
    const prefix = `${Const.OUTPUT_FILE_NAME.PREFIX.PERMISSION}_`;
    return outputData.map(row => {
      const fileId = row[Const.INDEX.PERMISSION_ARRAY.FILENAME].slice(
        prefix.length,
        -'.json'.length
      );

      if (fileId) updateIds.add(fileId);

      const nameAndEmailAddress =
        row[Const.INDEX.PERMISSION_ARRAY.ID] === 'anyoneWithLink'
          ? 'リンクを知っている全員'
          : row[Const.INDEX.PERMISSION_ARRAY.TYPE] === 'domain'
            ? row[Const.INDEX.PERMISSION_ARRAY.DISPLAY_NAME]
            : row[Const.INDEX.PERMISSION_ARRAY.DELETED] === 'true'
              ? '【削除されたアカウント】'
              : `${row[Const.INDEX.PERMISSION_ARRAY.DISPLAY_NAME]}(${row[Const.INDEX.PERMISSION_ARRAY.EMAIL_ADDRESS]})`;

      const detailRole = row[Const.INDEX.PERMISSION_ARRAY.DETAIL_ROLE] ?? '';
      const role = this.setRoleJapanese(detailRole);
      const outputRole =
        role !== row[Const.INDEX.PERMISSION_ARRAY.ROLE]
          ? `${role}（${row[Const.INDEX.PERMISSION_ARRAY.ROLE]}）`
          : role;

      const nameAndEmailAndRole = `${nameAndEmailAddress}：${outputRole}`;
      const inheritedFrom =
        row[Const.INDEX.PERMISSION_ARRAY.INHERITED] === 'true'
          ? '（上位フォルダから継承）'
          : '';

      return [fileId, nameAndEmailAndRole, inheritedFrom];
    });
  }

  /**
   * 既存のシートデータから、今回更新対象となったIDの古いレコードを除外し、新しいデータと結合します。
   * @param {string[][]} saveValues - シートから読み込んだ既存の全データ
   * @param {string[][]} newResults - 今回新しく処理したデータの配列
   * @param {Set<string>} updateIds - 今回更新されたファイルIDのセット
   * @returns {string[][]} 結合・フィルタリングが完了した2次元配列データ
   * @private
   */
  private mergeWithExistingData(
    saveValues: string[][],
    newResults: string[][],
    updateIds: Set<string>
  ): string[][] {
    const hasData =
      saveValues.length > 0 && saveValues[0].some(cell => cell !== '');
    if (!hasData) return newResults;

    const filteredValues = saveValues.slice(1).filter(row => {
      const fileId = row[0];
      return !updateIds.has(fileId);
    });

    return [...newResults, ...filteredValues];
  }
}

/**
 * 2.4. 権限レポート出力処理のエントリーポイント関数。
 */
export const runPermissionReportGeneration_ = (): void => {
  const generator = new PermissionReportGenerator(
    Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID,
    Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
  );
  generator.generateReport();
};

/**
 * 2.4c. 「作業用_権限出力対象IDリスト」シートに記載したファイルIDの権限情報を出力します。
 */
export const runPermissionReportGenerationFromSpecifiedIds_ = (): void => {
  const generator = new PermissionReportGenerator(
    Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID,
    Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
  );
  generator.generateReportFromSpecifiedIds();
};

/**
 * 2.4a. バッチ処理 Step1：対象ファイルIDリストを収集し、PropertiesServiceに保存します。
 * 入力ファイルが多い場合はこちらを使用してください。
 * 完了後、Step2 のタイムトリガーが自動登録されます。
 */
export const runPermissionReportGenerationStep1_ = (): void => {
  const generator = new PermissionReportGenerator(
    Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID,
    Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
  );
  generator.generateReportStep1();
};

/**
 * 2.4b. バッチ処理 Step2：PropertiesService に保存されたファイルIDリストを1バッチ分処理します。
 * 通常は Step1 が自動登録したトリガーから呼び出されます。手動実行も可能です。
 */
export const runPermissionReportGenerationStep2_ = (): void => {
  const generator = new PermissionReportGenerator(
    Const.PROPERTY_KEYS.PERMISSION_JSON_FOLDER_ID,
    Const.PROPERTY_KEYS.OUTPUT_SPREADSHEET_ID
  );
  generator.generateReportStep2();
};
