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
const AuditLogManager = {
  // ================= [設定エリア] =================
  USER_KEY: 'all',
  APPLICATION_NAME: 'drive',
  ACCOUNT_SHEET_NAME: '対象アカウント',
  PROPERTY_TOKEN_KEY: 'DRIVE_AUDIT_NEXT_PAGE_TOKEN', // プロパティの保存キー名
  // =================================================
  getJsonFolder: function () {
    const props = PropertiesService.getScriptProperties();
    const jsonFolderId = props.getProperty('JSON_FOLDER_ID');
    if (!jsonFolderId) {
      props.setProperty('JSON_FOLDER_ID', 'SET_YOUR_FOLDER_ID_HERE');
      throw new Error(
        'JSON_FOLDER_ID がスクリプトプロパティに設定されていません。処理を中断します。'
      );
    }
    const folder = DriveApp.getFolderById(jsonFolderId);
    if (!folder) {
      throw new Error(
        `指定されたフォルダID「${jsonFolderId}」が見つかりません。処理を中断します。`
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
   * 処理A：Reports APIからログを抽出し、指定フォルダにJSONファイルとして保存する（レジューム機能付き）
   */
  saveLogsToJson: function () {
    const folder = this.getJsonFolder();
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    // 2. Admin SDK API の有効化チェック
    if (typeof AdminReports === 'undefined') {
      throw new Error('Admin SDK API サービスを有効にしてください。');
    }

    // 3. プロパティから前回保存した nextPageToken があるか確認
    const scriptProperties = PropertiesService.getScriptProperties();
    let pageToken =
      scriptProperties.getProperty(this.PROPERTY_TOKEN_KEY) || undefined;

    if (pageToken) {
      console.log(`[Info] 前回の続きから再開します。Token: ${pageToken}`);
    } else {
      console.log('[Info] 初回実行、または最初からの取得を開始します。');
    }

    let pageCount = 1;
    const startTime = Date.now();
    const TIME_LIMIT = 4 * 60 * 1000; // 安全のため4分（240,000ミリ秒）を上限とする
    // 過去1ヶ月前の日時（startTime）を計算
    const now = new Date();
    const oneMonthAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      now.getDate(),
      now.getHours(),
      now.getMinutes(),
      now.getSeconds()
    );
    const startTimeString = oneMonthAgo.toISOString(); // 例: "2026-04-20T16:00:00.000Z"
    console.log(
      `[Info] 取得対象期間: ${startTimeString} 〜 現在まで（過去1ヶ月分）`
    );
    const items: any[] = [];
    // 4. 監査ログの取得とフィルタリングのループ
    do {
      const options = {
        pageToken: pageToken,
        maxResults: 1000,
        startTime: startTimeString,
      };

      console.log(`[API Fetch] ページ ${pageCount} のログを取得中...`);
      let response: any;
      try {
        response = AdminReports.Activities.list(
          this.USER_KEY,
          this.APPLICATION_NAME,
          options
        );
        if (!response || !response.items) {
          console.warn(
            `[Warning] ページ ${pageCount} で有効なデータが取得できませんでした。`
          );
          break;
        }
        // JSONファイル出力
        const activities = response.items;
        console.log(
          `[Info] ページ ${pageCount} で ${activities.length} 件のログを取得しました。`
        );
        try {
          const fileName = `audit_logs_${this._generateTimestamp()}_page${pageCount}.json`;
          const jsonString = JSON.stringify(activities, null, 2);

          folder.createFile(fileName, jsonString, MimeType.PLAIN_TEXT);
          console.log(
            `[Success] この実行で抽出された ${activities.length} 件のログを「${fileName}」に保存しました。`
          );
        } catch (e: any) {
          console.error(`[Error] フォルダへの保存に失敗しました: ${e.message}`);
        }
      } catch (e: any) {
        console.error(
          `[Error] APIの取得に失敗しました。トークンが失効している可能性があります。一度トークンをクリアしてください。: ${e.message}`
        );
        break;
      }

      // 次のページトークンを更新
      pageToken = response.nextPageToken;
      scriptProperties.setProperty(this.PROPERTY_TOKEN_KEY, pageToken || '');
      console.log(`[Property Saved] 次回再開用トークンを保存しました。`);
      pageCount++;

      // ⏳ 時間チェック：制限時間（4分）を超えそうなら、ループを抜けて現在の進捗を保存する
      if (pageToken && Date.now() - startTime > TIME_LIMIT) {
        console.log(
          `[Timeout Warning] GASの実行時間制限を考慮し、処理を一時中断します。次の実行時に再開します。`
        );
        break;
      }
    } while (pageToken);

    // 6. ステータス（nextPageToken）の更新保存
    if (pageToken) {
      // まだ続きがある場合：トークンをプロパティに保存
      scriptProperties.setProperty(this.PROPERTY_TOKEN_KEY, pageToken);
      console.log(`[Property Saved] 次回再開用トークンを保存しました。`);
    } else {
      // すべてのログを最後まで取り切った場合：プロパティからトークンを削除してクリア
      scriptProperties.deleteProperty(this.PROPERTY_TOKEN_KEY);
      console.log(
        `[Finished] すべてのログデータを最後まで取得し終えました。トークンをクリアします。`
      );
    }
  },

  /**
   * 手動用：不調な時や、最初からやり直したい時にトークンを強制リセットする関数
   */
  clearPageToken: function () {
    PropertiesService.getScriptProperties().deleteProperty(
      this.PROPERTY_TOKEN_KEY
    );
    console.log(
      '[Success] スクリプトプロパティの nextPageToken をクリアしました。次回は最初から取得します。'
    );
  },

  /**
   * 処理B：指定フォルダ内のすべてのJSONファイルを読み込み、スプレッドシートに出力する
   */
  exportJsonToSheet: function () {
    const ss: GoogleAppsScript.Spreadsheet.Spreadsheet =
      SpreadsheetApp.getActiveSpreadsheet();
    const accountList = this.getTargetInfo(this.getAccountSheet(ss));
    // 出力用の新しいシートを作成（シート名は現在の処理日時）
    const outputSheetName = this._generateSheetName();
    let outputSheet = ss.getSheetByName(outputSheetName);
    if (!outputSheet) {
      outputSheet = ss.insertSheet(outputSheetName);
    } else {
      outputSheet.clear();
    }
    outputSheet
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
          outputSheet
            .getRange(outputSheet.getLastRow() + 1, 1, result.length, 5)
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

/**
 * 実行関数1: ログを取得してJSONとして保存する（時間切れの場合はトークンを保持して中断）
 */
export function runSaveLogsToJson_() {
  AuditLogManager.saveLogsToJson();
}

/**
 * 補助関数: もし最初からやり直したくなった場合にトークンをリセットする
 */
export function resetLogToken_() {
  AuditLogManager.clearPageToken();
}
