# QuoteTemplateValidator

見積書テンプレートのバリデーションツールです。

## 概要

このツールは、見積書テンプレートのフォーマットや必須項目を自動的にチェックし、不備を検出します。

## 主な機能

- テンプレートシートの不備を確認します。

## 使い方

- スクリプトプロパティ`TEMPLATE_SPREADSHEET_ID`にテンプレートスプレッドシートのIDを設定してください。
- スクリプトプロパティ`TEST_SPREADSHEET_ID`が存在する場合は削除してください。
- checkItemsSheet(), validateItemsAndSummaryMatch(),checkItemsAndPrice()を実行してください。
- スクリプトプロパティ`TEST_SPREADSHEET_ID`を削除してください。
- checkFilterSettings1(), checkFilterSettings2(), checkFilterSettings3()を実行してください。

## ライセンス

このプロジェクトはMITライセンスのもとで公開されています。
