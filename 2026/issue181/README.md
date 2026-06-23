# 共有ドライブ権限一覧ツール（issue181）

共有ドライブ内の全ファイル・フォルダについて、**パスと権限（パーミッション）の一覧**をスプレッドシートに出力する Google Apps Script です。
ファイル数が多い運用を想定し、`modifiedTime` による**差分取得**（更新されたファイルだけ権限を取り直す）に対応しています。

## 構成

| ファイル | 役割 |
|---|---|
| `src/index.ts` | エントリポイント（GAS から実行する関数）とグローバル公開 |
| `src/functions.ts` | ロジック（一覧取得・権限取得・パス解決・差分判定・シート出力など） |
| `src/constants.ts` | 定数（取得フィールド、ヘッダ、日本語ラベル対応表 など） |

ビルドは [google/aside](https://github.com/google/aside)（clasp + rollup + TypeScript）構成です。`npm run build` で `src/` を `dist/` に1ファイルへバンドルし、clasp で push します。**GAS 上は1つの `Code.gs`** になります。

## 前提

- clasp でログイン済み（`npx clasp login`）であること
- Apps Script プロジェクトに **Drive 詳細サービス v3** を有効化（`appsscript.json` で設定済み）
- OAuth スコープ（`appsscript.json`）
  - `https://www.googleapis.com/auth/drive`（一覧・権限の取得、キャッシュ JSON の保存）
  - `https://www.googleapis.com/auth/spreadsheets.currentonly`（結果シートへの書き込み）
  - `https://www.googleapis.com/auth/script.scriptapp`（トリガー作成）
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
6. 問題なければ **`exportSharedDrivePermissions`** を実行（全件出力）
7. 定期実行する場合は **`createWeeklyTrigger`** を一度だけ実行

## 関数（エントリポイント）

| 関数 | 内容 |
|---|---|
| `setupSharedDriveId` | スクリプトプロパティ `SHARED_DRIVE_ID` が無ければダミー値で作成する |
| `exportSharedDrivePermissions` | メイン処理。差分取得で権限一覧を `permissions` シートへ出力する |
| `testExportSharedDrivePermissions` | 先頭50件だけ取得し `permissions_test` シートへ出力（キャッシュ不使用、確認用） |
| `clearPermissionCache` | 権限キャッシュの参照を消し、次回実行を全件取得に戻す |
| `createWeeklyTrigger` | 毎週月曜3時に `exportSharedDrivePermissions` を実行するトリガーを作成 |

## 出力

出力先はこのスクリプトのバインド先スプレッドシートです。

- 本番：`permissions` シート
- テスト：`permissions_test` シート

1行＝「1ファイル × 1権限明細」で、列は以下のとおりです。

| 列 | 内容 |
|---|---|
| パス | 共有ドライブ名から始まるフルパス |
| ファイルID | Drive のファイルID |
| ファイル名 | ファイル名 |
| 種類 | mimeType を日本語化（例：Google ドキュメント） |
| 表示名 | 権限付与先の表示名 |
| 付与先種別 | ユーザー／グループ／ドメイン／リンクを知っている全員 |
| メールアドレス | 権限付与先のメールアドレス |
| ドメイン | ドメイン |
| ロール | オーナー／管理者／コンテンツ管理者／編集者／コメント可／閲覧者 |
| 継承 | 親から継承された権限なら「親から継承」 |
| 検索結果 | 検索で表示される設定なら「表示する」 |
| アカウント削除 | 削除済みアカウントの場合のみ「削除済み」 |
| ビュー | published / metadata（該当する場合） |

### 値の補完ルール

メールアドレス（G列）が空の場合、次の順で補完します。

1. 表示名（E列）が `独立行政法人国立病院機構名古屋医療センター` のとき → 表示名を入れる
2. 付与先種別（F列）が「リンクを知っている全員」のとき → その値を入れる

ラベルや補完対象は `src/constants.ts`（`*_LABELS`、`DISPLAY_NAME_TO_EMAIL`）と
`src/functions.ts`（各 `to〜Label_` 関数）で変更できます。

## 差分取得とキャッシュ

- 各ファイルの `modifiedTime` を Drive 上の権限キャッシュ JSON（`permission_cache.json`）に保存します。
- 実行時、`modifiedTime` が前回と同じファイルはキャッシュの権限を再利用し、**更新／新規のファイルだけ** `permissions.list` を呼びます。
- 一覧に無くなったファイル（削除）はキャッシュからも自動で除去されます。
- 初回実行・キャッシュ削除後は全件取得になります。

### キャッシュファイルの保存場所

- `permission_cache.json` は、**スクリプトを実行したユーザーのマイドライブのルート**に作成されます（共有ドライブ内ではありません）。
- 作成後はファイルIDをスクリプトプロパティ `PERMISSION_CACHE_FILE_ID` に記録し、以降はIDで参照します。そのため、手動で別フォルダに移動しても動作します（IDが変わらないため）。
- `clearPermissionCache` はこのプロパティの参照を消すだけで、`permission_cache.json` 自体はマイドライブに残ります（次回実行時に新規作成されます）。

### 注意

- `modifiedTime` は**コンテンツ更新の時刻**で、**共有／権限だけの変更では更新されない**ことがあります。
  権限だけの変更を確実に拾いたい場合は、`clearPermissionCache` を実行してから全件取得し直してください（定期的なフル再取得を推奨）。
- 共有ドライブのファイル数が非常に多い場合、初回の全件取得が Apps Script の**6分実行制限**を超える可能性があります。その場合は分割実行の仕組みを追加してください。

## 開発

| コマンド | 内容 |
|---|---|
| `npm run build` | `src/` を `dist/` にバンドル |
| `npm test` | jest 実行 |
| `npm run lint` | ライセンスヘッダ付与 + eslint --fix |
| `npm run deploy` | lint・test・build 後、`.clasp-dev.json` の環境へ push |
| `npm run deploy:prod` | lint・test・build 後、`.clasp-prod.json` の環境へ push |
