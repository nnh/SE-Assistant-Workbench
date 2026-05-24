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
# SE-Assistant-Workbench / Google Drive 共有ドライブ監査・レポートシステム

Google Workspace の Admin SDK および Drive API を活用し、共有ドライブ内のアイテム（ファイル・フォルダ）の階層構造、設定ポリシー、およびユーザーのアクセス権限（パーミッション）を一括で抽出・解析し、スプレッドシートへマトリクス形式などでレポート出力する Google Apps Script (GAS) システムです。

本システムは、大量のデータ処理によるGASの実行制限（6分制限やメモリ上限）を回避するため、データを一度JSONファイルとして分割保存（アーカイブ）した上で、後続の処理でスプレッドシートへ統合出力する、段階的なバッチ処理アーキテクチャを採用しています。

---

## 処理フェーズ一覧

プログラムは機能および実行順序に応じて、大きく5つのフェーズに分かれています。各関数はこれらのステップに対応しています。

### フェーズ 1: 共有ドライブ構成のアーカイブとレポート

共有ドライブ内のフォルダ階層およびアイテム情報をスキャンし、ベースとなるデータを構築するフェーズです。

- **setupProjectProperties()**
  - システムの初期化処理です。実行に必要なスクリプトプロパティ（フォルダIDやシート名などの環境設定）の雛形をプロジェクトにセットします。
- **executeJsonArchivingProcess()**
  - 主処理です。処理対象キューから未処理の共有ドライブを1つずつ取り出し、配下のアイテム情報と権限情報を走査してJSONファイルとして一時保存します。
- **runReportGeneration()**
  - 出力処理です。保存されたJSONファイルをもとに、共有ドライブのフォルダ構成レポートをスプレッドシートへ書き出します。

### フェーズ 2: 詳細パーミッションの取得と出力

対象ファイルに対するアクセス権限を詳細に分析し、一覧化するフェーズです。

- **internalDriveExcludeCheck()**
  - 任意の事前処理です。パーミッション取得の対象外（監査不要）とする親フォルダを洗い出し、設定シートの情報をもとに除外フィルタリングの設定を行います。
- **archivePermissionsForTargetIds()**
  - 権限の取得対象となるファイルおよびフォルダの固有IDを抽出し、スプレッドシートへ一覧として出力します。
- **fetchPermissionsAndSaveForTargetIds()**
  - 抽出された対象IDをもとに、Google Drive API からパーミッション情報を取得し、JSONファイルとして分割保存します。
- **runPermissionReportGeneration()**
  - 保存されたパーミッションのJSONデータを統合し、権限一覧レポートとしてスプレッドシートに出力します。

### フェーズ 3: 外部アカウント権限の抽出

組織外への情報漏洩リスクを特定するための特化型監査フェーズです。

- **externalAccountPermissionReport()**
  - 指定された組織内ドメイン（例: aro.staff等）以外の外部アカウント、またはパーソナルアカウントに対して付与されている権限情報のみをホワイトリスト方式で抽出し、レポート化します。

### フェーズ 5: データ統合とアクセス権マトリクス生成

収集したすべての情報を組み合わせ、最終的な監査成果物を生成するフェーズです。

- **runDrivePermissionMatrixReportGeneration()**
  - 共有ドライブのアイテム構造データと、フェーズ2などで取得した詳細な権限情報をシステム内部でマージ（紐付け）し、「どのファイルに、誰が、どのような権限でアクセスできるか」を俯瞰できるクロス集計形式のアクセス権マトリクスレポートを生成します。

---

## 動作要件

本システムを実行する環境では、以下のGoogleサービスへのアクセス権限および拡張サービスの有効化が必要です。

1. **必須サービス（Advanced Google Services）**
   - Google Drive API (`Drive` v3)
2. **権限要件**
   - 実行ユーザーは、対象となる共有ドライブに対する管理者権限、またはドメイン全体の監査を行うための Google Workspace 特権管理者（または相応の管理ロール）を保持している必要があります。

---

## 開発とデプロイ

本プロジェクトは TypeScript + Rollup によるバンドル環境を採用しています。

- **ソースコード（開発環境）**: `src/` 配下の各TypeScriptモジュール
- **ビルド成果物（GAS環境）**: `dist/` 配下にバンドル・コンパイルされたJavaScriptファイル
- **ビルドコマンド**: `npm run build`

グローバル名前空間での関数衝突を防ぐため、実際のロジックは各モジュール内（例: `driveItemsArchiver`, `permissionArchiver`等）に隠蔽されており、`src/index.ts` のエントリーポイント用関数から末尾にアンダースコアのついた内部関数（例: `runNextArchiving_()`）を呼び出す設計となっています。
