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

## 概要

プロトコルからCSRに必要な情報を取得します。

## 使い方

### test.R

ローカルディレクトリに保存したプロトコルPDFから必要な情報を取得し、Googleスプレッドシートに出力します。  
`src/R`に`config.json`を作成し、下記のように情報を記載してから処理を実行してください。
マイドライブに「YYYYMMDD*プロトコル名*バージョン\_プロトコル情報抽出」スプレッドシートが出力されます。不要になったらスプレッドシートを削除してください。

```
{
  "input_pdf_path": "xxx.pdfのフルパス",
  "mailAddress": "Googleアカウント",
}

```