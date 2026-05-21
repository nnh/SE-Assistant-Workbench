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
 * 監査ログを取得し、1ページごとにJSONファイルとして保存する
 */
export function fetchAndSaveAuditLogsRaw_(): void {
  // 保存先フォルダの指定
  const folderId = PropertiesService.getScriptProperties().getProperty(
    'AUDIT_LOG_FOLDER_ID'
  );
  if (!folderId) {
    PropertiesService.getScriptProperties().setProperty(
      'AUDIT_LOG_FOLDER_ID',
      ''
    ); // 初期化
    throw new Error(
      'スクリプトプロパティに「AUDIT_LOG_FOLDER_ID」を設定してください。'
    );
  }
  const saveFolder = DriveApp.getFolderById(folderId);
  if (!saveFolder) {
    throw new Error('指定されたフォルダIDが見つかりません: ' + folderId);
  }
  const userKey = 'all';
  const applicationName = 'drive';
  const now = new Date();
  // --- 開始時間を 25時間前（25 * 60 * 60 * 1000）に設定 ---
  const startTime = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
  try {
    if (typeof AdminReports === 'undefined') {
      throw new Error('Admin SDK API サービスを有効にしてください。');
    }

    let pageToken: string | undefined;
    let pageCount = 1;

    do {
      const response: any = AdminReports.Activities.list(
        userKey,
        applicationName,
        {
          startTime: startTime,
          pageToken: pageToken,
          maxResults: 1000,
        }
      );

      const activities = response.items;

      if (activities && activities.length > 0) {
        // 1ページごとにJSONファイルを作成して保存
        const timestamp = Utilities.formatDate(now, 'JST', 'yyyyMMdd_HHmmss');
        const fileName = `audit_raw_${timestamp}_page${pageCount}.json`;
        const jsonContent = JSON.stringify(activities, null, 2);

        saveFolder.createFile(fileName, jsonContent, MimeType.PLAIN_TEXT);
        console.log(`保存完了: ${fileName} (${activities.length}件)`);
      }

      pageToken = response.nextPageToken;
      pageCount++;
    } while (pageToken);

    console.log('すべてのログ取得とファイル保存が完了しました。');
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error('取得・保存エラー: ' + message);
  }
}
/**
 * イベント名を日本語に変換する
 */
function getEventDisplayName_(eventName: string): string {
  const eventMap: Record<string, string> = {
    request_access: 'アクセスがリクエストされました',
    shared_drive_membership_change: '共有ドライブのメンバーシップの変更',
    shared_drive_settings_change: '共有ドライブの設定に関する変更',
    change_user_access: 'ユーザーの共有権限が変更されました',
    change_user_access_hierarchy_reconciled:
      '階層の調整によりユーザーの共有権限が変更されました',
    download: 'ファイルがダウンロードされました',
    change_document_visibility_hierarchy_reconciled:
      '階層の調整によりドキュメントのリンク共有の公開設定が変更されました',
    change_document_visibility: 'ドキュメントのリンク共有の公開設定の変更',
    change_document_access_scope:
      'ドキュメントのリンク共有アクセスタイプの変更',
    unmovable_item_reparented: '移動できないドキュメントの親が変更されました',
    publish_change: 'ドライブの公開ステータスの変更',
  };
  return eventMap[eventName] || eventName;
}
/**
 * 指定した名前のシートを取得、または作成して見出しを設定する
 */
function getOrCreateSheet_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  sheetName: string
): GoogleAppsScript.Spreadsheet.Sheet {
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const header = [
      '発生日時',
      'イベント名',
      '操作者',
      '対象ユーザー',
      'ファイル名',
      'ファイルID',
      'オーナー',
      'ドキュメントタイプ',
      '公開設定の変更',
    ];
    sheet.appendRow(header);
    sheet
      .getRange(1, 1, 1, header.length)
      .setFontWeight('bold')
      .setBackground('#d9ead3');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * 保存したJSONファイルを読み込み、監査ログとアクセス権リクエストに振り分けてスプレッドシートに書き込む
 */
export function writeLogsToSheet_(): void {
  const scriptProperties = PropertiesService.getScriptProperties();
  if (!scriptProperties.getProperty('EXCLUDED_DOMAINS')) {
    throw new Error(
      'スクリプトプロパティに「EXCLUDED_DOMAINS」を設定してください。'
    );
  }
  const excludedDomainsStr =
    scriptProperties.getProperty('EXCLUDED_DOMAINS') || '';
  const excludedDomains = excludedDomainsStr
    .split(',')
    .map(d => d.trim().toLowerCase());

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // 2つのシートを準備
  const auditSheet = getOrCreateSheet_(ss, 'その他の監査ログ');
  const requestSheet = getOrCreateSheet_(ss, 'アクセス権リクエスト');

  const excludedEvents = [
    'accept_suggestion',
    'create',
    'create_comment',
    'create_suggestion',
    'delete',
    'delete_comment',
    'delete_suggestion',
    'edit',
    'edit_comment',
    'move',
    'reject_suggestion',
    'rename',
    'resolve_comment',
    'search',
    'sheets_import_range',
    'sheets_import_url',
    'source_copy',
    'sync_item_content',
    'trash',
    'untrash',
    'view',
    'access_url',
    'access_item_content',
    'prefetch_item_content',
  ];

  const todayStr = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');
  const mimeTypeStr = MimeType.PLAIN_TEXT;
  const files = DriveApp.searchFiles(
    `title contains 'audit_raw_${todayStr}' and mimeType = '${mimeTypeStr}'`
  );

  // 振り分け用の配列
  const auditLogData: (string | number)[][] = [];
  const requestLogData: (string | number)[][] = [];

  while (files.hasNext()) {
    const file = files.next();
    const content = file.getBlob().getDataAsString();
    const activities: any[] = JSON.parse(content);

    activities.forEach(activity => {
      const event = activity.events[0];
      const eventName = event.name;
      const actorEmail = activity.actor?.email?.toLowerCase() || '';

      if (excludedEvents.includes(eventName)) return;

      if (eventName === 'download') {
        const emailDomain = actorEmail.split('@')[1];
        if (excludedDomains.includes(emailDomain)) return;
      }

      const isPrimary = event.parameters?.find(
        (p: any) => p.name === 'primary_event'
      )?.value;
      if (isPrimary === false) return;

      const eventDisplayName = getEventDisplayName_(eventName);
      const timestamp = Utilities.formatDate(
        new Date(activity.id.time),
        'JST',
        'yyyy/MM/dd HH:mm:ss'
      );
      const params = event.parameters;

      const fileName =
        params.find((p: any) => p.name === 'doc_title')?.value || '---';
      const fileId =
        params.find((p: any) => p.name === 'doc_id')?.value || '---';
      const targetUser =
        params.find((p: any) => p.name === 'target_user')?.value || '---';
      const owner = params.find((p: any) => p.name === 'owner')?.value || '---';
      const fileType =
        params.find((p: any) => p.name === 'doc_type')?.value || '---';

      const visibilityRaw = params.find(
        (p: any) => p.name === 'visibility_change'
      )?.value;
      let visibilityDisplayName: string;
      switch (visibilityRaw) {
        case 'none':
          visibilityDisplayName = '---';
          break;
        case 'external':
          visibilityDisplayName = '内部 → 外部';
          break;
        case 'internal':
          visibilityDisplayName = '外部 → 内部';
          break;
        default:
          visibilityDisplayName = visibilityRaw || '---';
      }

      const row = [
        timestamp,
        eventDisplayName,
        actorEmail,
        targetUser,
        fileName,
        fileId,
        owner,
        fileType,
        visibilityDisplayName,
      ];

      // イベント名によって振り分け
      if (eventName === 'request_access') {
        requestLogData.push(row);
      } else {
        auditLogData.push(row);
      }
    });
  }

  // データ書き込み処理のヘルパー
  const writeToSheet = (
    targetSheet: GoogleAppsScript.Spreadsheet.Sheet,
    data: (string | number)[][]
  ) => {
    const nowStr = Utilities.formatDate(
      new Date(),
      'JST',
      'yyyy/MM/dd HH:mm:ss'
    );

    if (data.length > 0) {
      // データがある場合はソートして書き込み
      data.sort(
        (a, b) =>
          new Date(a[0] as string).getTime() -
          new Date(b[0] as string).getTime()
      );
      targetSheet
        .getRange(targetSheet.getLastRow() + 1, 1, data.length, data[0].length)
        .setValues(data);
      console.log(`${targetSheet.getName()}: ${data.length} 件書き込み完了`);
    } else {
      // データが0件の場合の処理
      const message = '対象期間内に該当するレコードはありませんでした。';
      targetSheet.appendRow([nowStr, message]);

      // メッセージ行を少し目立たせる（任意）
      targetSheet
        .getRange(targetSheet.getLastRow(), 1, 1, 2)
        .setFontColor('#666666')
        .setFontStyle('italic');

      console.log(
        `${targetSheet.getName()}: 対象データなし（通知メッセージを記録）`
      );
    }
  };

  // 実行
  writeToSheet(auditSheet, auditLogData);
  writeToSheet(requestSheet, requestLogData);
}
