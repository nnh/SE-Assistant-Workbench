<!--
Copyright 2026 Google LLC

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
# 共有ドライブ権限一覧ツール（issue181）

共有ドライブ内の全ファイル・フォルダについて、**パスと権限（パーミッション）の一覧**をスプレッドシートに出力する Google Apps Script です。
ファイル数が多い運用を想定し、`modifiedTime` による**差分取得**と**時間予算内での段階的な実行**に対応しています。

## 構成

| ファイル | 役割 |
|---|---|
| `src/index.ts` | エントリポイント（GAS から実行する関数）とグローバル公開 |
| `src/functions.ts` | データ取得・生成（一覧取得・権限取得・パス解決・差分判定・生データ生成・シート書き込み・キャッシュ） |
| `src/format.ts` | 整形（生データ→日本語ラベル変換・メール補完・結合・リッチテキスト） |
| `src/constants.ts` | 定数（取得フィールド、ヘッダ、日本語ラベル対応表、各種設定値 など） |

ビルドは [google/aside](https://github.com/google/aside)（clasp + rollup + TypeScript）構成です。`npm run build` で `src/` を `dist/` に1ファイルへバンドルし、clasp で push します。**GAS 上は1つの `Code.gs`** になります。

## 前提

- clasp でログイン済み（`npx clasp login`）であること
- Apps Script プロジェクトに **Drive 詳細サービス v3** を有効化（`appsscript.json` で設定済み）
- OAuth スコープ（`appsscript.json`）
  - `https://www.googleapis.com/auth/drive`（一覧・権限の取得、キャッシュ JSON の保存）
  - `https://www.googleapis.com/auth/spreadsheets.currentonly`（結果シートへの書き込み）
- 実行ユーザーは対象共有ドライブの**管理者／コンテンツ管理者**であること
  （これでないと `files.list`／`permissions.list` が権限を返さない場合があります）

## セットアップ

1. `npm install`
2. `npm run deploy` で push（lint・test・build・push を実行）
3. Apps Script エディタで **`setupSharedDriveId`** を実行
   → スクリプトプロパティ `SHARED_DRIVE_ID` がダミー値で作成される
4. プロジェクトの設定 → スクリプト プロパティで、`SHARED_DRIVE_ID` を**対象共有ドライブのID**に書き換える
   （ID は共有ドライブの URL `…/drive/folders/<ここ>`）
5. **`testExportSharedDrivePermissions`** を実行して認可を承認し、出力内容を確認
6. **`exportSharedDrivePermissions`** を実行（件数が多い場合は段階実行。後述）
7. 定期実行する場合は、エディタの「トリガー」から `exportSharedDrivePermissions` の時間主導型トリガーを手動で設定

## 関数

### メイン

| 関数 | 内容 |
|---|---|
| `exportSharedDrivePermissions` | 共有ドライブを走査し、差分取得して結果シートへ出力する（時間予算内で段階的に） |
| `formatPermissions` | 権限を再取得せず、キャッシュとファイル一覧から整形し直して結果シートへ出力する |
| `testExportSharedDrivePermissions` | 先頭50件だけ取得しテスト用シートへ出力（キャッシュ不使用、確認用） |

### 作業用（手動で実行）

| 関数 | 内容 |
|---|---|
| `setupSharedDriveId` | スクリプトプロパティ `SHARED_DRIVE_ID` が無ければダミー値で作成する |
| `checkFilePermissions` | スクリプトプロパティ `CHECK_FILE_ID` のファイルの権限をログに出す |
| `setNotesValidation` | `備考` シートC列に入力規則（指定2値のみ）を設定する |
| `setListConditionalFormatting` | 結果シートに条件付き書式（説明該当行・フォルダ行）を設定する |
| `setNotesOrphanFormatting` | `備考` シートで、A列のIDが結果シートに無い行を色付けする |
| `clearPermissionCache` | 権限キャッシュの参照を消し、次回実行を全件取得に戻す |

## メニュー

スプレッドシートを開くと（`onOpen`）、メニューに **「権限エクスポート」→「権限一覧を出力」** が追加され、本番の `exportSharedDrivePermissions` を実行できます。その他の関数はメニューに出していません（Apps Script エディタから実行）。

※ コードを push した直後はスプレッドシートを開き直すとメニューが表示されます。

## 出力

出力先はこのスクリプトのバインド先スプレッドシートです。

- 結果：**「ARO外部共有ファイル一覧」シート**（シート名は `src/constants.ts` の `OUTPUT_SHEET_NAME`）
- テスト：`ARO外部共有ファイル一覧_test` シート

行は**パス順（フォルダ階層どおりのツリー状）**で並び、ゴミ箱内のファイルは除外されます。
結果シートは **1ファイル1行** で、1ファイルに複数の権限がある場合は権限ごとの値をセル内改行で結合します（各行が1権限として列をまたいで揃います）。

| 列 | 内容 |
|---|---|
| パス | 親フォルダのパス（ドライブ名から。末尾のファイル名/フォルダ名はC列と重複するため除く） |
| ファイルID | Drive のファイルID |
| ファイル名 | ファイル名（フォルダの場合はフォルダ名） |
| 種類 | mimeType を日本語化（例：Google ドキュメント、フォルダ） |
| メール/ロール/継承/検索結果/アカウント削除/ビュー | 権限ごとに `メール : ロール（フラグ）` の形でまとめる。フラグは値があるものだけ括弧内に `・` 区切りで並ぶ（継承＝親から継承、検索＝検索可、削除＝削除済み、ビュー＝公開ビュー／メタデータ） |
| 説明 | `備考` シートからファイルIDで突き合わせた説明（後述） |
| 取得日時 | そのファイルの権限を取得した日時（段階取得のためファイルごとに異なる） |

結合列の例（1セル内、権限が複数あるファイル）:

```
user@example.com : 編集者
group@example.com : 閲覧者（親から継承・公開ビュー）
olduser@example.com : 閲覧者（削除済み）
リンクを知っている全員 : 閲覧者（検索可）
```

**「（親から継承）」を含む行は文字色を薄いグレー**にして、直接付与の権限が目立つようにしています（リッチテキスト。色は `src/format.ts` の `INHERITED_TEXT_COLOR`）。

### 値の補完ルール

メールアドレスが空の場合、表示部分を次の順で補完します。

1. 表示名が `独立行政法人国立病院機構名古屋医療センター`（`DISPLAY_NAME_TO_EMAIL`）のとき → 表示名を入れる
2. 付与先種別が「リンクを知っている全員」のとき → その値を入れる

ラベルや補完対象は `src/constants.ts`（`*_LABELS`、`DISPLAY_NAME_TO_EMAIL`）と `src/format.ts`（各 `to〜Label_` 関数・`formatRows_`）で変更できます。

### 条件付き書式（`setListConditionalFormatting`）

結果シートに次の書式を設定します（行全体の背景）。

- **説明（F列）** が指定の2値のいずれか → 薄い黄色
- **種類（D列）** が「フォルダ」 → 濃いめの青＋太字

## 備考シート（任意）

`備考` という名前のシートを用意すると、ファイルごとの説明を結果に反映できます。

- 列：A列＝ファイルID、B列＝ファイル名、C列＝説明（1行目は見出し）
- 突き合わせは **A列のファイルIDのみ**で行います（B列は使いません）
- `備考` シートが無い場合、「説明」列は空欄になります（エラーにはなりません）
- `setNotesValidation`：C列に入力規則（プルダウン。`NOTES_DESCRIPTION_OPTIONS` の2値のみ・それ以外は不可）
- `setNotesOrphanFormatting`：A列のファイルIDが結果シートB列に無い行を薄い赤で色付け

## 差分取得とキャッシュ

- 各ファイルの `modifiedTime` と取得日時・権限を、Drive 上の権限キャッシュ JSON（`permission_cache.json`）に保存します。
- 実行時、`modifiedTime` が前回と同じファイルはキャッシュの権限を再利用し、**更新／新規のファイルだけ** `permissions.list` を呼びます。
- 一覧に無くなったファイル（削除・ゴミ箱）はキャッシュからも自動で除去されます。
- 初回実行・キャッシュ削除後は全件取得になります。

### キャッシュファイルの保存場所

- `permission_cache.json` は、**スクリプトを実行したユーザーのマイドライブのルート**に作成されます（共有ドライブ内ではありません）。
- 作成後はファイルIDをスクリプトプロパティ `PERMISSION_CACHE_FILE_ID` に記録し、以降はIDで参照します。そのため、手動で別フォルダに移動しても動作します。
- `clearPermissionCache` はこのプロパティの参照を消すだけで、`permission_cache.json` 自体はマイドライブに残ります（次回実行時に新規作成）。

### 注意

`modifiedTime` は**コンテンツ更新の時刻**で、**共有／権限だけの変更では更新されない**ことがあります。権限だけの変更を確実に拾いたい場合は、`clearPermissionCache` を実行してから全件取得し直してください（定期的なフル再取得を推奨）。

## 段階的な実行（6分制限対策）

ファイル数が多いと、初回の全件取得は Apps Script の**6分実行制限**を超えます。そのため `exportSharedDrivePermissions` は **1回の実行で時間予算（`src/constants.ts` の `FETCH_BUDGET_MS`、既定4.5分）内だけ権限を取得**し、**できたところまで結果シートに出力**します。

- 取得できたファイルはキャッシュに保存され、次回の実行では再利用（高速）されます。
- 取得しきれなかったファイルは次回以降の実行で続きを取得します。
- 実行ログに「今回取得 N件 / 残り M件（未完了：再実行で続きを取得 ／ 完了）」が出ます。

### 完成までの運用

1. **時間主導トリガー**（例：10分おき）で `exportSharedDrivePermissions` を実行するよう設定します（Apps Script エディタ →「トリガー」）。
2. 実行のたびに途中経過がシートに反映され、ログの「残り0件（完了）」で全件そろいます。
3. 完成後は変更分だけ取得するため高速です。トリガーはそのまま定期更新に使えます。

> ログは `console.log` で出力しており、手動実行時の実行ログ、および「実行数(Executions)」／Cloud Logging で確認できます（トリガー実行分もここで見られます）。

## スクリプトプロパティ

| キー | 用途 |
|---|---|
| `SHARED_DRIVE_ID` | 走査対象の共有ドライブID（必須） |
| `CHECK_FILE_ID` | `checkFilePermissions` で権限を確認するファイルID |
| `PERMISSION_CACHE_FILE_ID` | 権限キャッシュ JSON のファイルID（自動で記録） |

## 開発

| コマンド | 内容 |
|---|---|
| `npm run build` | `src/` を `dist/` にバンドル |
| `npm test` | jest 実行 |
| `npm run lint` | ライセンスヘッダ付与 + eslint --fix |
| `npm run deploy` | lint・test・build 後、`.clasp-dev.json` の環境へ push |
| `npm run deploy:prod` | lint・test・build 後、`.clasp-prod.json` の環境へ push |
