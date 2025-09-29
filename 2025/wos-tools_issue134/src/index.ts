/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { hello } from './example-module';
import {
  extractWOSRecordsToSheet_,
  verifyWosIdsInJsonFiles_,
  createQueryString_,
  importWosTsvToSheet_,
} from './test';
// 4. WoSのTSVデータをスプレッドシートにインポートする処理
function importWosTsvToSheet() {
  importWosTsvToSheet_();
}
// 3. WoS GUI検索用のクエリ文字列を作成する処理
function createQueryString() {
  createQueryString_();
}
// 2. 調査対象スプレッドシートから情報を取得し、JSONファイルに存在するか確認する処理
function verifyWosIdsInJsonFiles() {
  verifyWosIdsInJsonFiles_();
}
// 1. 調査対象のレコードを抽出してスプレッドシートに書き出す処理
function extractWOSRecordsToSheet() {
  extractWOSRecordsToSheet_();
}
console.log(hello());
