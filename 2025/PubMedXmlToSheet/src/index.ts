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
import { fetchPubmedData_ } from './fetchPubmedData';

function main() {
  const outputValues: string[][] | undefined = fetchPubmedData_();
  if (outputValues) {
    // スプレッドシートに出力する処理を追加
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    sheet.clear(); // 既存のデータをクリア
    sheet
      .getRange(1, 1, outputValues.length, outputValues[0].length)
      .setValues(outputValues);
  } else {
    console.log('PubMedデータの取得に失敗しました。');
  }
}
