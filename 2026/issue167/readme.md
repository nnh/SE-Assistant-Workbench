<!--
Copyright 2025 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# Google ドライブ監査ログ出力ツール

Google ドライブ内の操作ログ（Admin SDK Reports API）を自動取得し、Google スプレッドシートに整理して出力するスクリプトです。
「アクセス権リクエスト」とその他のログを別々のシートに自動で振り分けます。

## 🚀 主な機能

- **自動ログ取得**: Admin SDK を使用し、過去 25 時間分の操作ログを取得します。
- **ファイル保存**: 取得した生データを JSON 形式で Google ドライブに一時保存します。
- **シート出力**: JSON を解析し、以下の 2 つのシートへ出力します。
  - `その他の監査ログ`: 権限変更、ダウンロード、公開設定の変更など。
  - `アクセス権リクエスト`: ファイルへのアクセス権限リクエストのみ。
- **フィルタリング機能**:
  - 特定ドメインによる業務上のダウンロードを除外。
  - 不要なシステムイベント（閲覧、移動、編集など）をブラックリスト形式で除外。
- **自動実行**: トリガーを設定することで、毎日自動で更新されます。

## 🛠 セットアップ手順

### 1. 準備

- Google Apps Script (GAS) プロジェクトを作成します。
- **サービス**から **Admin SDK API** を追加してください。

### 2. スクリプトプロパティの設定

GAS の「プロジェクトの設定」にて、以下のスクリプトプロパティを追加してください。

- **プロパティ名**: `EXCLUDED_DOMAINS`
- **値のイメージ**: `example.co.jp,example.com`（カンマ区切りで除外したいドメインを指定）
- **プロパティ名**: `AUDIT_LOG_FOLDER_ID`
- **値のイメージ**: `123abc...`（監査ログを保存するフォルダのIDを指定）

## 📂 ファイル構成

- src/index.ts: エントリポイント。GASのトリガーから呼び出す公開関数を定義します。

- src/driveAuditManager.ts: メインロジック。Admin SDKからのデータ取得、フィルタリング、スプレッドシートへの出力処理を担当します。

- src/types/globals.d.ts: 型定義ファイル。TypeScript環境で MimeType などのGASグローバル変数を正しく認識させるために使用します。

- test/auditLogManager.test.ts: Jest によるテストコード。ロジックの正確性や例外処理を検証します。

## 📊 出力シートの構成

出力先の Google スプレッドシートには、以下のカラムが自動生成されます。

- 発生日時 / イベント名 / 操作者 / 対象ユーザー / ファイル名 / ファイルID / オーナー / ドキュメントタイプ / 公開設定の変更

## 📝 ライセンス

Copyright 2025 Google LLC. Licensed under the Apache License, Version 2.0.
