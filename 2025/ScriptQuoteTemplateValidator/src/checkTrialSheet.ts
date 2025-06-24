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
import {
  getSheetBySheetName_,
  quotationRequestSheetName,
  trialSheetName,
  coefficients15,
} from './commonForTest';
export function checkTrialSheet_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
) {
  const trialSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    spreadsheet,
    trialSheetName
  );
  const quotationRequestSheet: GoogleAppsScript.Spreadsheet.Sheet =
    getSheetBySheetName_(spreadsheet, quotationRequestSheetName);
  const quoteType =
    quotationRequestSheet.getRange('B2').getValue() === '参考見積'
      ? '御参考見積書'
      : quotationRequestSheet.getRange('B2').getValue() === '正式見積'
        ? '御見積書'
        : '不明な見積種別';
  if (trialSheet.getRange('B2').getValue() !== quoteType) {
    throw new Error(
      `試験種別が見積種別と一致しません。試験種別: ${trialSheet.getRange('B2').getValue()}, 見積種別: ${quoteType}`
    );
  }
  if (
    trialSheet.getRange('B4').getValue() !==
    quotationRequestSheet.getRange('C2').getValue()
  ) {
    throw new Error(`見積発行先に不一致があります。
      試験シート: ${trialSheet.getRange('B4').getValue()},
      見積シート: ${quotationRequestSheet.getRange('C2').getValue}`);
  }
  if (
    trialSheet.getRange('B8').getValue() !==
    quotationRequestSheet.getRange('D2').getValue()
  ) {
    throw new Error(`研究代表者名に不一致があります。
        試験シート: ${trialSheet.getRange('B8').getValue()},
        見積シート: ${quotationRequestSheet.getRange('D2').getValue}`);
  }
  if (
    trialSheet.getRange('B9').getValue() !==
    quotationRequestSheet.getRange('E2').getValue()
  ) {
    throw new Error(`試験課題名に不一致があります。
            試験シート: ${trialSheet.getRange('B9').getValue()},
            見積シート: ${quotationRequestSheet.getRange('E2').getValue}`);
  }
  if (
    trialSheet.getRange('B10').getValue() !==
    quotationRequestSheet.getRange('F2').getValue()
  ) {
    throw new Error(`試験実施番号に不一致があります。
                試験シート: ${trialSheet.getRange('B10').getValue()},
                見積シート: ${quotationRequestSheet.getRange('F2').getValue}`);
  }
  if (
    trialSheet.getRange('B27').getValue() !==
    quotationRequestSheet.getRange('G2').getValue()
  ) {
    throw new Error(`試験種別に不一致があります。
                        試験シート: ${trialSheet.getRange('B27').getValue()},
                        見積シート: ${quotationRequestSheet.getRange('G2').getValue}`);
  }
  if (
    trialSheet.getRange('B28').getValue() !==
    quotationRequestSheet.getRange('V2').getValue()
  ) {
    throw new Error(`症例数に不一致があります。
                        試験シート: ${trialSheet.getRange('B28').getValue()},
                        見積シート: ${quotationRequestSheet.getRange('V2').getValue}`);
  }
  if (
    trialSheet.getRange('B29').getValue() !==
    quotationRequestSheet.getRange('W2').getValue()
  ) {
    throw new Error(`施設数に不一致があります。
                        試験シート: ${trialSheet.getRange('B29').getValue()},
                        見積シート: ${quotationRequestSheet.getRange('W2').getValue}`);
  }
  if (quotationRequestSheet.getRange('AL1').getValue() !== 'CDISC対応') {
    throw new Error(`CDISC対応の項目が見積シートにありません。
                            見積シートのAL1セルを確認してください。`);
  }
  const crf =
    quotationRequestSheet.getRange('AL2').getValue() === 'あり'
      ? quotationRequestSheet.getRange('X2').getValue() * 3
      : quotationRequestSheet.getRange('AL2').getValue() === 'なし'
        ? quotationRequestSheet.getRange('X2').getValue()
        : '';
  if (crf === '') {
    throw new Error(
      `CDISC対応が不明です。見積シートのAL2セルを確認してください。`
    );
  }
  if (trialSheet.getRange('B30').getValue() !== crf) {
    throw new Error(`CRF項目数に不一致があります。
                        試験シート: ${trialSheet.getRange('B30').getValue()},
                        見積シート: ${crf}`);
  }
  // 試験期間は別途確認
  const coefficients: string =
    quotationRequestSheet.getRange('AN2').getValue() === '公的資金（税金由来）'
      ? '1'
      : quotationRequestSheet.getRange('AN2').getValue() === coefficients15
        ? '1.5'
        : '-1';
  if (coefficients === '-1') {
    throw new Error(
      `見積発行先が不明です。見積シートのAN2セルを確認してください。`
    );
  }
  if (trialSheet.getRange('B44').getValue().toString() !== coefficients) {
    throw new Error(`係数に不一致があります。
                            試験シート: ${trialSheet.getRange('B44').getValue()},
                            見積シート: ${coefficients}`);
  }
  console.log('Trialシートのチェックが完了しました。');
}
