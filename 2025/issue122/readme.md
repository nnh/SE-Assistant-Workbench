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

# プロジェクト名

Googleドライブのコンテンツ移行用スクリプトです。

## 前提条件

node.js、claspがインストールされていること

## スクリプトのインポート

1. 新規スプレッドシートを作成します。
1. `.clasp-dev.json`の`parentId`に作成したスプレッドシートのID、`scriptId`にスプレッドシートのGASのIDをセットします。
1. `npm run deploy:no-test`でこのリポジトリのスクリプトが作成したスプレッドシートに反映します。

## mainの処理

1. `const targetFolderId = 'FOLDER_ID_HERE';`の`'FOLDER_ID_HERE'`を移動する予定のフォルダのIDに書き換えてください。
1. GASでmainを実行してください。指定したフォルダ以下のフォルダ、ファイルの情報を取得して「共有権限」に出力します。`🎉 全処理完了。合計: xxx件`とコンソールに出力されれば処理完了です。
1. 異常終了した場合はもう一度処理を実行すると、続きからデータを取得します。最初からやり直す場合は「検索済み」シートをクリアしてください。

## testの処理

1. mainの処理を実行してからtestを実行してください。
1. `const targetFolderId = 'FOLDER_ID_HERE';`の`'FOLDER_ID_HERE'`を確認したいフォルダのIDに書き換えてください。
1. スクリプトプロパティの`BEFORE_SPREADSHEET_ID`に移動前のファイル情報を出力したスプレッドシートのIDが設定されていることを確認してください。異なる場合は修正してください。
1. GASでtestを実行してください。
