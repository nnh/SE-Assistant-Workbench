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
  createBaseTestPattern_,
  createArrayFromTwoItems_,
} from './createTestPatternCommon';
import {
  trialTypeName,
  specificClinicalResearch,
  testPatternKeys,
} from './commonForTest';
function getBasePatternIndex0SpecificClinicalResearch_(
  index: number
): Map<string, string> {
  const basePatternMap = createBaseTestPattern_();
  const baseIndex = index - 3;
  const baseKey = testPatternKeys.get(baseIndex);
  if (!baseKey) {
    throw new Error(`Base pattern key not found for index ${baseIndex}`);
  }
  const basePattern = basePatternMap.get(baseKey)!;
  basePattern.set(trialTypeName, specificClinicalResearch);
  return basePattern;
}
export function createTestDataSpecificClinicalResearch_(
  index: number
): Map<string, string> {
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
  const pattern =
    index === 4 ? pattern_nashi : index === 3 ? pattern_ari : null;
  if (!pattern) {
    throw new Error(`Invalid index for specific clinical research: ${index}`);
  }
  const basePattern: Map<string, string> =
    getBasePatternIndex0SpecificClinicalResearch_(index);
  pattern.forEach(([key, value]) => {
    basePattern.set(key, value);
  });
  return basePattern;
}
