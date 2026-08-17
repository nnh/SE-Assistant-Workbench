# WHO-DD IDF Update

## 概要

このリポジトリには、WHO-DD（WHO Drug Dictionary）とIDF（医薬品名データファイル）を管理・更新するためのスクリプトが含まれています。これらのスクリプトは、ファイルの解凍、パスワード保護ファイルの処理、AWS S3へのファイルのアップロード、Boxへのファイルの保存を支援します。

## インストール

環境を構築し、必要な依存関係をインストールするには、以下の手順に従ってください。

1. リポジトリをクローンする:
   1. https://github.com/nnh/SE-Assistant-Workbench の「Code」から「Download Zip」をクリックします。
   2. ダウンロードしたファイルを右クリックし、「すべて展開」を選択して保存します。

2. Rで必要なライブラリをインストールします。
3. 環境変数に7-Zipを追加する: `C:\Program Files\7-Zip;` がシステムの環境変数に追加されていることを確認してください。

## 使い方

### スクリプト実行前の設定

スクリプトを実行する前に、`ext/config.txt.example`を`ext/config.txt`としてコピーし、各項目を実際の値に置き換えてください。

```config.txt
"itemname", "item"
"kCodingDirId", "BOXフォルダID"
"kAwsDefaultRegion", "AWSリージョン"
"kAwsBucketName", "AWSバケット名"
```

### スクリプトの実行方法

1. RStudioを開く: コンピュータでRStudioを起動します。
2. 新規プロジェクトを設定する: WHO-DD_IDF_Updateディレクトリを新規プロジェクトとして開きます。
3. スクリプトを開きます。
4. スクリプトを実行する: sourceボタンをクリックしてスクリプトを実行します。

### ダウンロードしたZIPファイルをBOXにアップロードする手順

1. `programs/box-authentication.R`を開きます。
   BOXのSecret IDとAWSのAccess Keyの入力が必要な場合があります。
   D013-4 SEアシスタントマニュアル（随時）の15. WHODrug, IDF, MedDRAデータ格納マニュアルを参照してください。
2. スクリプトを実行する: sourceボタンをクリックしてスクリプトを実行します。
3. `programs/upload-box.R`を開きます。
4. スクリプトを実行する: sourceボタンをクリックしてスクリプトを実行します。

### BoxからAWSへZIPファイルをアップロードする手順

1. 最新のWHO-DDとIDFがBoxに保存されていることを確認します。
2. `programs/box-authentication.R`を開きます。
3. スクリプトを実行する: sourceボタンをクリックしてスクリプトを実行します。
4. `programs/upload-s3.R`を開きます。
5. スクリプトを実行する: sourceボタンをクリックしてスクリプトを実行します。

### テスト

1. `tools/test-main.R`を開きます。
2. スクリプトを実行する: sourceボタンをクリックしてスクリプトを実行します。

## ドキュメント

https://docs.google.com/document/d/1dTO-n-SESKSQu9P6SCXZdesxjYtidwTWgnHastHwYjs/edit?tab=t.0
