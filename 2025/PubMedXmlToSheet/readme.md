# PubMedXmlToSheet

このリポジトリは、PubMedのXMLデータをGoogleスプレッドシートに出力するツールです。

## 機能

- PubMed XMLファイルの読み込み
- 必要な情報（例: タイトル、著者、抄録、出版年など）の抽出
- スプレッドシート形式での出力

## 使い方

1. PubMedからXMLファイルをダウンロードします。

```URL例
https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=12345678,2345678&retmode=xml
```

1. XMLファイルをGoogleドライブに格納し、格納した場所のIDをスクリプトプロパティで指定します。
1. 本ツールを実行すると、このスクリプトがバインドされているスプレッドシートのアクティブシートにジャーナル情報が出力されます。

## 必要環境

- Google Workspace
- Node.js

## 実行方法

下記のコマンドで、.clasp-dev.jsonに指定したスプレッドシートのスクリプトにツールがPushされます。

```bash
npm run deploy
```

スプレッドシートのメニューの拡張機能からApps Scriptを開き、mainを実行してください。

## ライセンス

MIT License
