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
  coefficients15,
  testPatternKeys,
  observationalStudy,
  trialTypeName,
} from './commonForTest';
/*
export function getBasePatternIndex0_(): Map<string, string> {
  const basePattern = createBaseTestPattern_();
  const key = testPatternKeys.get(0);
  if (!key) {
    throw new Error(`Test pattern key for index 0 not found`);
  }
  const res = basePattern.get(key);
  if (!res) {
    throw new Error(`Base pattern for index 0 not found`);
  }
  return res;
}*/
export function createBaseTestPattern_(): Map<string, Map<string, string>> {
  // 要素が1つのもの
  const singleValueItems: [string, string][] = [
    [trialTypeName, observationalStudy],
    ['タイムスタンプ', '2025/6/23 10:00'],
    ['見積発行先', 'テスト見積発行先'],
    ['研究代表者名', 'テスト研究代表者名'],
    ['試験課題名', 'テスト試験課題名'],
    ['試験実施番号', 'テスト試験実施番号'],
    ['副作用モニタリング終了日', ''],
    ['目標症例数', '100'],
    ['実施施設数', '200'],
    ['CRF項目数', '300'],
    ['備考', 'てすと備考'],
    ['メールアドレス', 'xxx@example.com'],
    ['症例登録開始日', '2036/4/1'],
    ['症例登録終了日', '2037/1/31'],
    ['試験終了日', '2037/3/31'],
  ];

  // 要素が複数のもの
  const multiValueItems: [string, string[]][] = [
    ['見積種別', ['参考見積', '正式見積']],
    ['AMED申請資料作成支援', ['あり', 'なし']],
    ['キックオフミーティング', ['あり', 'なし']],
    ['その他会議（のべ回数）', ['0', '4']],
    ['調整事務局設置の有無', ['あり', 'なし']],
    ['中間解析業務の依頼', ['あり', 'なし']],
    ['原資', ['公的資金（税金由来）', coefficients15]],
    ['CDISC対応', ['あり', 'なし']],
    ['研究協力費、負担軽減費配分管理', ['あり', 'なし']],
    ['最終解析業務の依頼', ['あり', 'なし']],
  ];
  const [pattern_ari, pattern_nashi] = createArrayFromTwoItems_(
    multiValueItems,
    [...singleValueItems],
    [...singleValueItems]
  );
  // 中間解析業務の依頼ありの場合図表数と頻度を追加する
  const interimArray: [string, string[]][] = [
    ['中間解析に必要な図表数', ['0', '100']],
    ['中間解析の頻度', ['0', '3']],
  ];
  const [interim1, interim2] = createArrayFromTwoItems_(
    interimArray,
    pattern_ari,
    pattern_ari
  );
  // 最終解析業務の依頼ありの場合図表数を追加する
  const finalAnalysis: [string, string[]][] = [
    ['統計解析に必要な図表数', ['49', '100']],
  ];
  const [finalAnalysis1, finalAnalysis2] = createArrayFromTwoItems_(
    finalAnalysis,
    interim1,
    interim1
  );
  // 研究協力費、負担軽減費配分管理ありの場合のテストをテストパターン2に追加
  const researchGrant = [
    ['研究協力費、負担軽減費', '40000000'],
    ['試験開始準備費用', 'あり'],
    ['症例登録毎の支払', 'あり'],
    ['症例最終報告書提出毎の支払', 'あり'],
  ];
  researchGrant.forEach(([key, value]) => {
    finalAnalysis1.push([key, value]);
  });
  const baseTestPattern: Map<string, Map<string, string>> = new Map([
    [testPatternKeys.get(0)!, new Map(pattern_nashi)],
    [testPatternKeys.get(1)!, new Map(finalAnalysis1)],
    [testPatternKeys.get(2)!, new Map(finalAnalysis2)],
  ]);

  return baseTestPattern;
}
export function createArrayFromTwoItems_(
  inputArray: [string, string[]][],
  inputPattern1: [string, string][] = [],
  inputPattern2: [string, string][] = []
): [string, string][][] {
  const pattern1: [string, string][] = [...inputPattern1];
  const pattern2: [string, string][] = [...inputPattern2];
  inputArray.forEach(([key, values]) => {
    if (values.length > 2) {
      console.warn(
        `Warning: The item "${key}" has more than two values. Only the first two will be used.`
      );
    }
    const pattern1Item: [string, string] = [key, values[0]];
    const pattern2Item: [string, string] = [key, values[1]];
    pattern1.push(pattern1Item);
    pattern2.push(pattern2Item);
  });
  return [pattern1, pattern2];
}
// 観察研究以外で必要な項目
export const exceptForObservationalStudyItems: [string, string[]][] = [
  ['1例あたりの実地モニタリング回数', ['0', '3']],
  ['年間1施設あたりの必須文書実地モニタリング回数', ['0', '1']],
  ['監査対象施設数', ['0', '10']],
  ['保険料', ['0', '1000000']],
  ['効安事務局設置', ['設置・委託する', '設置しない、または委託しない']],
  ['安全性管理事務局設置', ['設置・委託する', '設置しない、または委託しない']],
];
