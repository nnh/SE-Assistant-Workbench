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
  exceptForObservationalStudyItems,
  getBasePatternIndex0_,
  createArrayFromTwoItems_,
} from './createTestPatternCommon';
import {
  testPatternKeys,
  trialTypeName,
  specificClinicalResearch,
} from './commonForTest';
function getBasePatternIndex0SpecificClinicalResearch_(): Map<string, string> {
  const basePattern = getBasePatternIndex0_();
  basePattern.set(trialTypeName, specificClinicalResearch);
  return basePattern;
}
export function createTestDataSpecificClinicalResearch_() {
  // 特定臨床研究のみの項目
  const specificClinicalResearchItems: [string, string[]][] = [
    ['CRB申請', ['あり', 'なし']],
    ['研究結果報告書作成支援', ['あり', 'なし']],
  ];
  const multiValueItems: [string, string[]][] = [
    ...specificClinicalResearchItems,
    ...exceptForObservationalStudyItems,
  ];
  const [pattern_ari, pattern_nashi] = createArrayFromTwoItems_(
    multiValueItems,
    [],
    []
  );
  const pattern1: Map<string, string> =
    getBasePatternIndex0SpecificClinicalResearch_();
  pattern_ari.forEach(([key, value]) => {
    pattern1.set(key, value);
  });
  const pattern2: Map<string, string> =
    getBasePatternIndex0SpecificClinicalResearch_();
  pattern_nashi.forEach(([key, value]) => {
    pattern2.set(key, value);
  });
  const keyNashi: string = testPatternKeys.get(3)!;
  const keyAri: string = testPatternKeys.get(4)!;
  const testPattern: Map<string, Map<string, string>> = new Map([
    [keyAri, pattern1],
    [keyNashi, pattern2],
  ]);
  return testPattern;
}
