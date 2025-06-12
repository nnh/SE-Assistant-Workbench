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

# GenerateUnitPriceTableFromQuoteTemplate

## 概要

見積テンプレートから単価表を自動生成するツールです。

## 特徴

- 見積テンプレートの解析
- 単価表の自動生成

## インストール方法

```bash
git clone git@github.com:nnh/SE-Assistant-Workbench.git
cd 2025/GenerateUnitPriceTableFromQuoteTemplate
touch .clasp-dev.json
```

## .clasp-dev.json

```
{
  "scriptId": "スクリプトID",
  "rootDir": "dist",
  "parentId": "スクリプトをバインドするスプレッドシートのID",
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

2. 下記コマンドで`.clasp-dev.json`に指定したGASプロジェクトにスクリプトが反映されます。

```bash
 npm run deploy
```

3. スプレッドシートからGASを開き、プロジェクトの設定でスクリプトプロパティを設定してください。
   | 設定項目 | 値の例 | 説明 |
   |------------------------|-------------------------|--------------------------------------|
   | INPUT_SPREADSHEET_2015 | （スプレッドシートID） | 2015年版見積テンプレートのスプレッドシートのIDを指定します |
   | OUTPUT_SPREADSHEET_2015 | （スプレッドシートID） | 2015年版価格表出力用スプレッドシートのIDを指定します |
   | INPUT_SPREADSHEET_2025 | （スプレッドシートID） | 2025年版見積テンプレートのスプレッドシートのIDを指定します |
   | OUTPUT_SPREADSHEET_2025 | （スプレッドシートID） | 2025年版価格表出力用スプレッドシートのIDを指定します |
4. スクリプトの説明を参照し、必要なスクリプトを実行してください。

## スクリプトの説明

### createSheetYYYY(YYYYは年、2015または2025)

YYYY年版価格表を出力します。スクリプトプロパティ`INPUT_SPREADSHEET_YYYY`と`OUTPUT_SPREADSHEET_YYYY`の設定が必要です。  
価格表出力後、execCheckValuesYYYYを実行して価格表の精査を行います。エラーがある場合はコンソールにエラーが出力されます。

### execCheckTemplateVariablesYYYY(YYYYは年、2015または2025)

`INPUT_SPREADSHEET_YYYY`のテンプレートからテスト用スプレッドシートを作成し、価格変動項目に関する金額の精査を行います。

### execCheckValuesYYYY(YYYYは年、2015または2025)

YYYY年版価格表の精査を行います。

## 必要要件

- Node.jsのインストールが必要です。

## ライセンス

MIT License
