# WHO-DD IDF Update

## 概要

このリポジトリには、WHO-DD（World Health Organization Drug Dictionary）および IDF（Integrated Data File）を管理・更新するためのスクリプトが含まれています。これらのスクリプトは、ファイルの解凍、パスワード付きファイルの処理、AWS S3 へのファイルアップロード、Box へのファイル保存を行います。

## インストール

環境を構築し、必要な依存関係をインストールするには、以下の手順に従ってください。

1. リポジトリをクローンする

   1. https://github.com/nnh/SE-Assistant-Workbench の Code から Download Zip をクリックする。
   2. ダウンロードしたファイルを右クリックし、「すべて展開」して保存する。

2. R で必要なライブラリをインストールする
3. 7-Zip を環境変数に追加する: `C:\Program Files\7-Zip;` がシステムの環境変数に追加されていることを確認する。

## 使い方

### スクリプト実行前の設定

#### config.txt

`ext/config.sample.txt` を同じ `ext` フォルダ内に `config.txt` という名前でコピーし、各値を実際の設定に置き換えてください（`config.txt` は Git 管理対象外です）。

```config.txt
"itemname","item"
"kCodingDirId","BOXフォルダID"
"kAwsDefaultRegion","AWSリージョン"
"kAwsBucketName","AWSバケット名"
```

- 1 行目のヘッダ `"itemname","item"` は削除しないでください。
- `kCodingDirId` … Box のフォルダ ID / `kAwsDefaultRegion` … AWS リージョン（例: `ap-northeast-1`）/ `kAwsBucketName` … AWS バケット名
- サンプルの初期値（`BOXフォルダID` など）のままだったり、項目が空・欠落している場合はエラーで停止します。

#### .Renviron（AWS 認証情報）

AWS へアップロードするスクリプトの初回実行時、`~/.Renviron` が無ければ AWS Access Key ID / Secret Access Key の入力を求められ、自動作成されます。既存の `.Renviron` に AWS 情報が無い場合はエラーで停止します。
（Box の Client ID / Secret は `.Renviron` には保存せず、後述のとおり認証スクリプト実行時に毎回入力します。）

### スクリプトの実行方法

1. RStudio を開く: コンピュータで RStudio を起動する。
2. 新規プロジェクトを設定する: WHO-DD_IDF_Update ディレクトリを New Project として開く。
3. スクリプトを開く。
4. スクリプトを実行する: source ボタンをクリックしてスクリプトを実行する。

### ダウンロードした ZIP ファイルを BOX にアップロードする手順

まず認証します。

1. `programs/box-authentication.R` を開く。
2. スクリプトを実行する: source ボタンをクリックしてスクリプトを実行する。
   実行のたびに BOX Client ID と Client Secret の入力を求められます（毎回入力する方式です）。入力するとブラウザが開き、Box にログインして認証します。値は D013-4 SE Assistance Manual 内の WHODrug Data Storage Manual のセクション 15 を参照してください。

#### MedDRA / IDF（自動アップロード）

3. `programs/upload-box.R` を開く。
4. スクリプトを実行する: source ボタンをクリックしてスクリプトを実行する。
   （IDF はパスワードの入力を求められます。WHODD はここではアップロードされません。）

#### WHODD（手動アップロード）

WHODD の zip は大容量で boxr では自動アップロードできないため、手動でアップロードします。

5. `programs/upload-whodd-box.R` を開く。
6. スクリプトを実行する: source ボタンをクリックしてスクリプトを実行する。
   アップロード先の Box フォルダ（圧縮ファイル）がブラウザで開き、対象ファイルのあるフォルダ（通常 Downloads）も開きます。コンソールに対象ファイルとサイズが一覧表示されます。
7. 開いた Downloads から Box のフォルダへ、一覧表示された WHODD の zip をドラッグ&ドロップしてアップロードする。

### Box から AWS に ZIP ファイルをアップロードする手順

1. 最新の WHO-DD と IDF が Box に保存されていることを確認する。
2. `programs/box-authentication.R` を開く。
3. スクリプトを実行する: source ボタンをクリックしてスクリプトを実行する。
4. `programs/upload-s3.R` を開く。
5. スクリプトを実行する: source ボタンをクリックしてスクリプトを実行する。

### テスト

#### 結合テスト（Box / AWS の内容確認）

1. `tools/test-main.R` を開く。
2. スクリプトを実行する: source ボタンをクリックしてスクリプトを実行する。

#### 単体テスト

認証フローなどの単体テストは `tests` フォルダにあります。`tests/run-tests.R` を source 実行すると、`tests` 内の `test-*.R` がまとめて実行され、結果サマリが表示されます（実際の Box 認証や通信は行いません）。新しいテストは `tests/test-xxx.R` として追加してください。

## ドキュメント

https://docs.google.com/document/d/1dTO-n-SESKSQu9P6SCXZdesxjYtidwTWgnHastHwYjs/edit?tab=t.0
