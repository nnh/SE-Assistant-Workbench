<!--
Copyright 2023 Google LLC

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
# ScriptQuoteTemplateValidator

ScriptQuoteTemplateValidatorは、見積テンプレートのスクリプト実行結果の検証を行うツールです。

## インストール

```bash
git clone git@github.com:nnh/SE-Assistant-Workbench.git
```

GoogleDriveで任意の場所に新規スプレッドシートを作成してください。  
ScriptQuoteTemplateValidatorディレクトリ直下に`.clasp-dev.json`を作成してください。

### .clasp-dev.jsonの設定

```
{
  "scriptId": "このスクリプトを保存するGASプロジェクトのID",
  "rootDir": "dist",
  "parentId": "このスクリプトを保存するGASプロジェクトをバインドするスプレッドシートのID",
  "scriptExtensions": [
    ".js",
    ".gs"
  ],
  "htmlExtensions": [
    ".html"
  ],
  "jsonExtensions": [
    ".json"
  ],
  "filePushOrder": [],
  "skipSubdirectories": false
}
```

## 使い方

### GASプロジェクトへのスクリプト反映

```bash
npm run deploy
```

### 見積テンプレートファイルの設定

スプレッドシートのメニュー「拡張機能」からApps Scriptを開いてください。  
設定の「スクリプトプロパティ」にキー「TEMPLATE_SPREADSHEET_ID」値「見積テンプレートファイルのスプレッドシートID」を設定してください。

### 実行手順

- Apps Scriptで「setTest」を実行してください。
- テスト用ファイルが存在しない場合、見積テンプレートをコピーしたテスト用ファイルを作成します。テスト用ファイルのスプレッドシートIDはスクリプトプロパティの「TEST_SPREADSHEET_ID」に設定されます。
- テスト用ファイルのQuotation Requestシートにテスト情報が設定されます。テスト用ファイルのメニューから「見積作成」をクリックし、「見積項目設定」を実行してください。
- Apps Scriptで「checkTest」を実行してください。問題が発生している場合はコンソールにエラーが出力されます。
- 必要な回数だけ、setTest~CheckTestの処理を繰り返してください。2025年6月25日現在、テストパターンは8パターンです。

## ライセンス

このプロジェクトはMITライセンスのもとで公開されています。
