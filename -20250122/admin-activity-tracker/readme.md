# admin-activity-tracker

## 概要

管理者権限で実行された操作のログを集約し、Google スプレッドシートに出力するプログラムです。

### 対象ログソース

| ソース | フォルダ | 出力シート |
|--------|----------|------------|
| FortiGate | `FortiGate/` | FortiGate |
| Google 管理コンソール | `Google/` | Google |
| PrimeDrive | `PrimeDrive/` | PrimeDrive |
| ARONAS（NAS） | `ARONAS/` | ARONAS |
| Zoom | `Zoom/phone/` | ZoomPhone |

## インストール

1. リポジトリを取得する

   - GitHub の Code ボタンから「Download ZIP」を選択してダウンロードする
   - ダウンロードしたファイルを右クリックして「すべて展開」で解凍する

2. 必要なRパッケージをインストールする

   RStudio を開き、以下のコマンドを実行する：

   ```r
   install.packages(c("tidyverse", "googlesheets4", "jsonlite", "here"))
   ```

## 使い方

### 実行前の設定

スクリプトと同じフォルダに `config.json` を作成し、以下の内容を記載する：

```json
{
  "spreadsheet_id": "スプレッドシートのIDを記入"
}
```

スプレッドシートIDは、Google スプレッドシートのURLの `/d/` と `/edit` の間にある文字列です。

### 実行手順

1. RStudio を起動する
2. `admin-activity-tracker` ディレクトリを新規プロジェクトとして開く
3. `admin_activity_tracker.R` を開く
4. 対象年月を確認する（デフォルトは前月）

   ```r
   # スクリプト末尾付近の以下の行で対象年月を指定します
   targetYm <- GetPreviousMonth()  # 前月を対象にする場合
   # targetYm <- NULL              # すべてのファイルを対象にする場合
   ```

5. 「Source」ボタンをクリックして実行する
6. Google 認証のプロンプトが表示された場合は画面の指示に従って認証する

## トラブルシューティング

### Google 認証エラー

Google 認証を求められた場合は、画面の指示に従って Google Sheets API へのアクセスを許可してください。

### パッケージが見つからないエラー

インストールコマンドを再実行してください：

```r
install.packages(c("tidyverse", "googlesheets4", "jsonlite", "here"))
```

### スプレッドシートIDが無効

`config.json` の `spreadsheet_id` に設定したIDが正しいか確認してください。IDはスプレッドシートのURLから確認できます：

```
https://docs.google.com/spreadsheets/d/【ここがID】/edit
```

### ログファイルが読み込まれない

ログファイルのファイル名に年月が含まれているか確認してください。`targetYm` で指定した年月がファイル名に含まれていないと対象外になります。
