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
 * 監査ログの取得・出力処理を管理するオブジェクト (aside管理用)
 */
import * as Const from './const';
const AuditLogManager = {
  // ================= [設定エリア] =================
  ACCOUNT_SHEET_NAME: Const.SHEET_NAME.ACCOUNT,
  AUDIT_SHEET_NAME: Const.SHEET_NAME.AUDIT_LOG,
  FILE_SHEET_NAME: Const.SHEET_NAME.FILE,
  // =================================================
  getJsonFolder: function (): GoogleAppsScript.Drive.Folder {
    const folderId =
      PropertiesService.getScriptProperties().getProperty('JSON_FOLDER_ID');
    if (!folderId) {
      throw new Error(
        '監査ログが保存されているフォルダIDがプロパティに設定されていません。'
      );
    }
    const folder = DriveApp.getFolderById(folderId);
    if (!folder) {
      throw new Error(
        '指定されたフォルダIDに対応するフォルダが見つかりません。プロパティの設定を確認してください。'
      );
    }
    return folder;
  },
  getAccountSheet: function (ss: GoogleAppsScript.Spreadsheet.Spreadsheet) {
    const accountSheet = ss.getSheetByName(this.ACCOUNT_SHEET_NAME);
    if (!accountSheet) {
      ss.insertSheet(this.ACCOUNT_SHEET_NAME);
      throw new Error(
        `「${this.ACCOUNT_SHEET_NAME}」シートが見つかりません。新規作成しました。アカウントリストを入力してから再度実行してください。`
      );
    }
    return accountSheet;
  },
  getTargetInfo: function (
    sheet: GoogleAppsScript.Spreadsheet.Sheet
  ): string[] {
    // 1. キーワード一覧を取得
    const keywords = this._getTargetKeywords(sheet);
    if (keywords.length === 0) {
      throw new Error(
        `[Error] 「${this.ACCOUNT_SHEET_NAME}」シートにアカウントリストが入力されていません。`
      );
    }
    return keywords;
  },

  /**
   * 指定フォルダ内のすべてのJSONファイルを読み込み、スプレッドシートに出力する
   */
  exportJsonToSheet: function () {
    const ss: GoogleAppsScript.Spreadsheet.Spreadsheet =
      SpreadsheetApp.getActiveSpreadsheet();
    const accountList = this.getTargetInfo(this.getAccountSheet(ss));
    // 出力用の新しいシートを作成（既に存在する場合はクリア）
    let auditSheet = ss.getSheetByName(this.AUDIT_SHEET_NAME);
    if (!auditSheet) {
      auditSheet = ss.insertSheet(this.AUDIT_SHEET_NAME);
    } else {
      auditSheet.clear();
    }
    auditSheet
      .getRange(1, 1, 1, 5)
      .setValues([['タイトル', 'ID', 'イベント', 'アクター', '発生日時']]);

    const folder: GoogleAppsScript.Drive.Folder = this.getJsonFolder();

    // 1. フォルダ内のすべてのファイルを走査してJSONを解析
    const files: GoogleAppsScript.Drive.FileIterator = folder.getFiles();

    while (files.hasNext()) {
      const file: GoogleAppsScript.Drive.File = files.next();
      // MIMEタイプまたは拡張子がJSONのものを対象とする
      if (
        file.getMimeType() !== MimeType.PLAIN_TEXT ||
        !file.getName().endsWith('.json')
      ) {
        console.log(
          `[Skip] ファイル ${file.getName()} はJSONファイルではないためスキップします。`
        );
        continue;
      }
      console.log(`[Read File] ${file.getName()} を読み込み中...`);
      try {
        const content = file.getBlob().getDataAsString();
        const jsonArray = JSON.parse(content);
        if (!Array.isArray(jsonArray)) {
          console.warn(
            `[Warning] ファイル ${file.getName()} の内容が配列ではないためスキップします。`
          );
          continue;
        }
        // actorプロパティが存在するアイテムのみを抽出（必要に応じてフィルタ条件を調整）
        const result = jsonArray
          .map(item => {
            // eventがsync_item_contentまたはaccess_item_contentなら出力対象外とする
            const eventName = item.events?.[0]?.name || '';
            if (
              eventName === 'sync_item_content' ||
              eventName === 'access_item_content'
            ) {
              return null; // 対象外のイベントはnullを返す
            }
            const actor = item.actor;
            if (!actor?.email) {
              return null; // actorプロパティがない場合はnullを返す
            }
            const checkResult = accountList.map(account => {
              // accountがactor.emailに部分一致するか確認
              if (actor.email.includes(account)) {
                return item; // 一致する場合はそのアイテムを返す
              }
            });
            if (checkResult.some(result => result !== undefined)) {
              const title = item.resourceDetails[0]?.title || '';
              const id = item.resourceDetails[0]?.id || '';
              const event = item.events[0]?.name || '';
              const time = item.id?.time || '';
              return [title, id, event, actor.email, time];
            } else {
              return null; // 一致しない場合はnullを返す
            }
          })
          .filter(item => item !== null); // nullを除外
        if (result.length > 0) {
          auditSheet
            .getRange(auditSheet.getLastRow() + 1, 1, result.length, 5)
            .setValues(result as string[][]);
          console.log(
            `[Success] ファイル ${file.getName()} から ${result.length} 件のログをシートに出力しました。`
          );
        }
      } catch (e: any) {
        console.warn(
          `[Warning] ファイル ${file.getName()} の解析に失敗したためスキップします: ${e.message}`
        );
      }
    }
  },

  _getTargetKeywords: function (sheet: GoogleAppsScript.Spreadsheet.Sheet) {
    const lastRow = sheet.getLastRow();
    if (lastRow === 0) return [];
    const values: string[][] = sheet.getRange(1, 1, lastRow, 1).getValues();
    return values.map(row => String(row[0]).trim()).filter(cell => cell !== '');
  },

  _generateTimestamp: function () {
    return Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd_HHmmss');
  },

  _generateSheetName: function () {
    return Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');
  },
};

export function runExportJsonToSheet_() {
  AuditLogManager.exportJsonToSheet();
}
