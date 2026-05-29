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
# 共有ドライブ設定レポート生成ツール

共有ドライブの設定（restrictions / capabilities）とメンバー権限を Google Drive API から取得し、スプレッドシートにレポートとして出力する Google Apps Script プロジェクトです。

## 機能概要

1. **保存フェーズ** — 対象の共有ドライブ情報・権限を Drive API から取得し、JSON ファイルとして指定フォルダに保存します。
2. **出力フェーズ** — 保存された最新の JSON ファイルを読み込み、スプレッドシートのシート（シート名：実行日 `YYYYMMDD`）にレポートを出力します。

### スクリプトプロパティの初期設定

GAS エディタ上で `initializeProject` 関数を実行すると、必要なプロパティの雛形が一括作成されます。
作成後、各プロパティに実際の値を設定してください。

| プロパティキー                          | 説明                                              |
| --------------------------------------- | ------------------------------------------------- |
| `SAVE_DESTINATION_FOLDER_ID`            | JSON ファイルの保存先フォルダ ID                  |
| `PERMISSION_SAVE_DESTINATION_FOLDER_ID` | 権限 JSON ファイルの保存先フォルダ ID             |
| `OUTPUT_SPREADSHEET_ID`                 | レポート出力先スプレッドシートの ID               |
| `POLICY_REPORT_TARGET_DRIVE_IDS`        | 対象の共有ドライブ ID（カンマ区切りで複数指定可） |

## 使い方

### デプロイ（開発環境）

```bash
npm run deploy
```

### デプロイ（本番環境）

```bash
npm run deploy:prod
```

### GAS 関数の実行

| 関数名                                 | 説明                                     |
| -------------------------------------- | ---------------------------------------- |
| `runSharedDrivePolicyReportGeneration` | 保存・出力フェーズを一括実行します       |
| `initializeProject`                    | スクリプトプロパティの雛形を初期化します |

## レポート出力仕様

- **シート名**：実行日（`YYYYMMDD` 形式）。同名シートが既存の場合はクリアして上書きします。
- **列構成**：ドライブ ID / ドライブ名 / 設定内容 / 出力日時
- **出力内容**：メンバー情報（表示名・メールアドレス・ロール）および共有ドライブの各種制限設定

## プロジェクト構成

```
src/
├── index.ts                              # エントリーポイント（GAS 公開関数）
├── baseReport.ts                         # 基底クラス（JSON・スプレッドシート操作の委譲）
├── common/
│   ├── const.ts                          # 定数・型定義
│   ├── driveApiService.ts                # Drive API 呼び出し（リトライ付き）
│   ├── fileUtils.ts                      # JSON ファイル保存・ファイル名生成
│   ├── jsonDataHandler.ts                # JSON ファイル読込・最新ファイル取得
│   ├── spreadsheetHandler.ts             # シート初期化・データ書き込み
│   └── utils.ts                          # フォルダ取得・日付フォーマット
└── core/
    ├── app/
    │   └── Initializer.ts                # スクリプトプロパティ初期化
    └── permission/
    │   ├── permissionArchiver.ts         # 権限情報の取得・JSON 保存
    │   └── permissionReportGenerator.ts  # 権限 JSON の解析・整形
    └── policy/
        └── sharedDrivePolicyReportGenerator.ts  # メイン処理（保存・出力フェーズ）
```

## npm スクリプト

| コマンド              | 説明                                         |
| --------------------- | -------------------------------------------- |
| `npm run build`       | クリーン・バンドル・appsscript.json のコピー |
| `npm run lint`        | ESLint 自動修正 + ライセンスヘッダーチェック |
| `npm test`            | Jest によるテスト実行                        |
| `npm run deploy`      | lint・test・build 後に開発環境へ push        |
| `npm run deploy:prod` | lint・test・build 後に本番環境へ push        |

## ライセンス

Apache License 2.0
