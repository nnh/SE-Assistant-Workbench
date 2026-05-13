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
 * 1. 監査ログを取得し、1ページごとにJSONファイルとして保存する
 */
export function fetchAndSaveAuditLogsRaw_(): void {
  const userKey = 'all';
  const applicationName = 'drive';
  const now = new Date();
  const startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

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

        DriveApp.createFile(fileName, jsonContent, MimeType.PLAIN_TEXT);
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
  };
  return eventMap[eventName] || eventName;
}
/**
 * 2. 保存されたJSONファイルを読み込み、スプレッドシートへ出力する
 */

export function writeLogsToSheet_(): void {
  const scriptProperties = PropertiesService.getScriptProperties();
  // スクリプトプロパティから除外ドメインを取得し、配列化する
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

  const SHEET_NAME = '監査ログ';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);

  // シート準備（存在しなければ作成）
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    const header = [
      '発生日時',
      'イベント名',
      '操作者',
      '対象ユーザー',
      'ファイル名',
      'ファイルID',
    ];
    sheet.appendRow(header);
    sheet
      .getRange(1, 1, 1, header.length)
      .setFontWeight('bold')
      .setBackground('#d9ead3');
    sheet.setFrozenRows(1);
  }

  // https://developers.google.com/workspace/admin/reports/v1/appendix/activity/drive?hl=ja
  /*const targetEvents = [
    'request_access',
    'shared_drive_membership_change',
    'shared_drive_settings_change',
    'change_user_access',
    'change_user_access_hierarchy_reconciled',
    'download',
    'change_document_visibility_hierarchy_reconciled',
    'change_document_visibility',
    'change_document_access_scope',
    'access_item_content',
    'prefetch_item_content',
  ];*/
  // 除外したいイベント名を指定する
  const excludedEvents = [
    'accept_suggestion', // 提案の承認
    'create', // 作成
    'create_comment', // コメントの作成
    'create_suggestion', // 提案の作成
    'delete', // 削除
    'delete_comment', // コメントの削除
    'delete_suggestion', // 提案の削除
    'edit', // 編集
    'edit_comment', // コメントの編集
    'move', // 移動
    'reject_suggestion', // 提案の拒否
    'rename', // 名前の変更
    'resolve_comment', // コメントの解決
    'search', // 検索
    'sheets_import_range', // シートの範囲インポート
    'sheets_import_url', // シートのURLインポート
    'source_copy', // ソースのコピー
    'sync_item_content', // アイテムのコンテンツの同期
    'trash', // ゴミ箱に移動
    'untrash', // ゴミ箱から復元
    'view', // 閲覧
    'access_url', // URLへのアクセス
    'access_item_content', // アプリケーションがユーザーに代わってアイテムのコンテンツにアクセスしました
    'prefetch_item_content', // アプリケーションがユーザーの代わりにアイテムのコンテンツをプリフェッチしました,
  ];

  // マイドライブから本日作成された audit_raw_*.json ファイルを検索
  const todayStr = Utilities.formatDate(new Date(), 'JST', 'yyyyMMdd');

  const mimeTypeStr = MimeType.PLAIN_TEXT;

  const files = DriveApp.searchFiles(
    `title contains 'audit_raw_${todayStr}' and mimeType = '${mimeTypeStr}'`
  );

  const allLogData: (string | number)[][] = [];

  while (files.hasNext()) {
    const file = files.next();
    const content = file.getBlob().getDataAsString();
    const activities: any[] = JSON.parse(content);

    activities.forEach(activity => {
      const event = activity.events[0];
      const eventName = event.name;
      const actorEmail = activity.actor?.email?.toLowerCase() || '';
      // 1. 基本的な除外イベント（閲覧等）のチェック
      if (excludedEvents.includes(eventName)) return;
      // 2. ダウンロードイベントかつ特定ドメインのチェック
      if (eventName === 'download') {
        // メールのドメイン部分を抽出 (@以降)
        const emailDomain = actorEmail.split('@')[1];
        // 除外ドメインリストに含まれている場合は業務内とみなしてスキップ
        if (excludedDomains.includes(emailDomain)) {
          return;
        }
      }
      // プライマリイベント以外のイベントはスキップ
      const isPrimary = event.parameters?.find(
        (p: any) => p.name === 'primary_event'
      )?.value;

      // 明示的に false と設定されている場合のみ除外
      // (undefined や true の場合は通過する)
      if (isPrimary === false) {
        return;
      }
      // 日本語名に変換
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

      // 変換した eventDisplayName を配列に入れる
      allLogData.push([
        timestamp,
        eventDisplayName,
        actorEmail,
        targetUser,
        fileName,
        fileId,
      ]);
    });
  }

  if (allLogData.length > 0) {
    // 複数のファイルから読み込むため、最後に全体を時間順でソート
    allLogData.sort(
      (a, b) =>
        new Date(a[0] as string).getTime() - new Date(b[0] as string).getTime()
    );

    sheet
      .getRange(
        sheet.getLastRow() + 1,
        1,
        allLogData.length,
        allLogData[0].length
      )
      .setValues(allLogData);
    console.log(`合計 ${allLogData.length} 件のログをシートに書き込みました。`);
  } else {
    console.log('書き込むデータが見つかりませんでした。');
  }
}
