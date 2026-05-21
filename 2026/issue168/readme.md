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
## システム概要

JSON形式で保存されたGoogle Workspace の監査ログ（Reports API / Drive）を読み込み、指定した複数のアカウントが、直近1ヶ月の間に Google ドライブ内のファイルへ何らかのアクセス（閲覧、編集、作成、ダウンロード等）を行った形跡を網羅的に抽出するツールです。

## 事前設定

- スクリプトプロパティの`JSON_FOLDER_ID`に監査ログを保存しているフォルダIDをセットしてください。
- 「対象アカウント」シートのA列に"aaa.bbb"のように、メールアドレスの@より前の部分を記載してください。一行目からデータとして扱います。
- 「共有ドライブID」シートのA列に共有ドライブのID、B列に共有ドライブの名称を記載してください。一行目からデータとして扱います。

## 1. `exportJsonToSheet`処理説明

### 処理概要

本プログラムは、事前にGoogleドライブ内の特定フォルダへ一時保存されたGoogle Workspaceの監査ログ（JSON形式）を順次読み込み、「対象アカウント」シートに登録されているユーザーが関与したログのみを抽出・整形し、「監査ログ」シートへ一括出力する処理です。

## 2. `getFilesInfo`処理説明

### 処理概要

本プログラムは、前段の処理で出力された「監査ログ」シートからファイルIDを一括で読み込み、それらのファイルが「共有ドライブ（どのドライブ名かまで特定）」にあるか、それとも「個人のマイドライブ」にあるかを自動判定して、結果を 「ファイル情報」シートへ一覧出力する処理です。

## 3. `outputAuditAndFileInfo`処理説明

### 処理概要

本プログラムは、前段までの処理で生成された「監査ログ（`AUDIT_LOG`）」シートと、各ファイルの所属を判定した「ファイル情報（`FILE`）」シートのデータを読み込み、共通の「ファイルID」をキーにして2つのデータを横方向に結合します。  
結合されたデータは、「出力」シートへ一括出力されます。
