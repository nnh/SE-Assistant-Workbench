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
  investigatorInitiatedClinicalTrial,
  testPatternKeys,
} from './commonForTest';
function getBasePatternIndexInvestigatorInitiatedClinicalTrial_(
  index: number
): Map<string, string> {
  const basePatternMap = createBaseTestPattern_();
  const baseIndex = index - 5;
  const baseKey = testPatternKeys.get(baseIndex);
  if (!baseKey) {
    throw new Error(`Base pattern key not found for index ${baseIndex}`);
  }
  const basePattern = basePatternMap.get(baseKey)!;
  basePattern.set(trialTypeName, investigatorInitiatedClinicalTrial);
  return basePattern;
}
export function createTestInvestigatorInitiatedClinicalTrial_(
  index: number
): Map<string, string> {
  // 医師主導治験のみの項目
  const investigatorInitiatedClinicalTrialItems: [string, string[]][] = [
    ['PMDA相談資料作成支援', ['あり', 'なし']],
    ['症例検討会', ['あり', 'なし']],
    ['治験薬管理', ['あり', 'なし']],
    ['治験薬運搬', ['あり', 'なし']],
  ];
  const multiValueItems: [string, string[]][] = [
    ...investigatorInitiatedClinicalTrialItems,
    ...exceptForObservationalStudyItems,
  ];
  const [pattern_ari, pattern_nashi] = createArrayFromTwoItems_(
    multiValueItems,
    [],
    []
  );
  const pattern =
    index === 5 || index === 7
      ? pattern_nashi
      : index === 6
        ? pattern_ari
        : null;
  if (!pattern) {
    throw new Error(
      `Invalid index for investigator initiated clinical trial: ${index}`
    );
  }
  const basePattern: Map<string, string> =
    getBasePatternIndexInvestigatorInitiatedClinicalTrial_(index);
  pattern.forEach(([key, value]) => {
    basePattern.set(key, value);
  });
  return basePattern;
}
