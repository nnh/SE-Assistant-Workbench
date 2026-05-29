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
# issue171

Box のコラボレーション情報をエクスポートした CSV をスプレッドシートに取り込み、管理区分ごとに整理する Google Apps Script (GAS) プロジェクトです。

## 機能概要

スプレッドシートを開くと上部メニューに「**コラボレーション管理**」が追加されます。「実行」を選択すると以下の2ステップが順番に動きます。

1. **CSVインポート** (`importCsvFiles_`) — Google Drive の指定フォルダから CSV を読み込み、日時ごとのシートに出力します。
2. **カテゴリ振り分け** (`distributeByCategory_`) — 最新の日時シートを元に「管理対象」「外部」シートへ振り分け、差分（削除済レコード）を追記します。

---

## セットアップ

### スクリプトプロパティ

| キー | 値 | 説明 |
|---|---|---|
| `FOLDER_ID` | フォルダID | CSVが格納されている Google Drive フォルダのID |

スクリプトエディタの「プロジェクトの設定」→「スクリプト プロパティ」から設定してください。

### デプロイ

```bash
npm run deploy       # 開発環境
npm run deploy:prod  # 本番環境
```

デプロイ後にスプレッドシートを開き直すと、メニューバーに「コラボレーション管理」が表示されます。

---

## ステップ1: CSVインポート (`importCsvFiles_`)

### 対象ファイル

`FOLDER_ID` に指定したフォルダ内のファイルのうち、以下のパターンに一致するものが対象です。

```
collaborations_run_on_YYYY-MM-DD-HH-mm-ss_ページ_N.csv
```

例: `collaborations_run_on_2026-05-28-15-39-18_ページ_1.csv`

### 動作

- ファイル名の日時部分（例: `2026-05-28-15-39-18`）をシート名として使用します。
- 同じ日時の複数ページ（`_ページ_1`、`_ページ_2`…）はページ順に結合して1シートに出力します（2ページ目以降はヘッダー行を除外）。
- **同名シートが既に存在する場合はスキップ**します（重複インポート防止）。
- 日時の昇順でシートが作成されます。

---

## ステップ2: カテゴリ振り分け (`distributeByCategory_`)

### 元データの列構成

日時シートには以下の列が含まれます（Box のエクスポート形式）。

| 列 | 項目名 |
|---|---|
| A | 所有者名 |
| B | 所有者のログイン |
| C | パス |
| D | パスID |
| E | 項目名 |
| F | 項目ID |
| G | 項目の種類 |
| H | コラボレータ名 |
| I | コラボレータのログイン |
| J | コラボレータの種類 |
| K | コラボレータ権限 |
| L | 招待主のメールアドレス |
| M | 招待日 |
| N | 招待承認日 |
| O | 有効期限 |

### 出力列構成

A・B・D・E・F・L列は除外されます。C列先頭の `すべてのファイル/` は削除されます。

| 出力列 | 項目名 |
|---|---|
| 1 | パス |
| 2 | 項目の種類 |
| 3 | コラボレータ名 |
| 4 | コラボレータのログイン |
| 5 | コラボレータの種類 |
| 6 | コラボレータ権限 |
| 7 | 招待日 |
| 8 | 招待承認日 |
| 9 | 有効期限 |
| 10 | ステータス |

### 振り分け条件

J列（コラボレータの種類）の値で振り分けます。

| 値 | 出力先シート |
|---|---|
| `管理対象` | 「管理対象」シート |
| `外部` | 「外部」シート |

### ソート

D列（パスID）の `/` 区切り値をパスコンポーネントとして昇順ソートし、フォルダ単位でレコードがまとまるよう並べます。

### 削除済レコードの検出

以下の3列をキーとして、前回出力時から存在しなくなったレコードを検出します。

- パス（出力列1）
- コラボレータのログイン（出力列4）
- コラボレータ権限（出力列6）

新データに存在しないレコードはシートの末尾に残し、ステータス列に削除元のシート名を付けて記録します。

```
削除済（2026-05-28-15-39-18）
```

過去の削除済レコードも引き続き保持されます。

### シートの作成・更新

- 「管理対象」「外部」シートが存在しない場合は新規作成します。
- 既存シートがある場合はクリアして書き直します（削除済レコードは引き継ぎます）。

---

## 列幅の設定

`src/distribute.ts` の `COLUMN_WIDTHS` 定数で出力列の幅を指定できます。

```typescript
// 0 の場合は自動調整、空配列は全列自動調整
const COLUMN_WIDTHS: readonly number[] = [
  610, 80, 180, 260, 130, 120, 80, 80, 0,
];
```

インデックスは出力列1〜9に対応します（ステータス列は未指定 → 自動調整）。

---

## 開発

```bash
npm run build   # ビルド（lint + テスト + バンドル）
npm test        # テストのみ実行
npm run bundle  # バンドルのみ実行
```

### ファイル構成

```
src/
  index.ts        # エントリポイント（onOpen でメニュー追加、main 関数）
  import-csv.ts   # CSVインポート処理
  distribute.ts   # カテゴリ振り分け処理
test/
  import-csv.test.ts
  distribute.test.ts
```
