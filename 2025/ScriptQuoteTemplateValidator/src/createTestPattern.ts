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
import { createBaseTestPattern_ } from './createTestPatternCommon';
import { getTargetTestPattern_ } from './setTestData';
import { testPatternKeys } from './commonForTest';
import { createTestDataSpecificClinicalResearch_ } from './createTestDataSpecificClinicalResearch';
import { createTestInvestigatorInitiatedClinicalTrial_ } from './createTestInvestigatorInitiatedClinicalTrial';

export function createTestPattern_(testPatternIndex: number) {
  if (!testPatternKeys.has(testPatternIndex)) {
    throw new Error(`Test pattern key not found for index ${testPatternIndex}`);
  }
  if (testPatternIndex >= 0 && testPatternIndex <= 2) {
    const baseTestPattern: Map<
      string,
      Map<string, string>
    > = createBaseTestPattern_();
    return getTargetTestPattern_(
      baseTestPattern,
      testPatternKeys.get(testPatternIndex)
    );
  } else if (testPatternIndex === 3 || testPatternIndex === 4) {
    // 特定臨床研究
    return createTestDataSpecificClinicalResearch_(testPatternIndex);
  } else if (testPatternIndex >= 5 && testPatternIndex <= 7) {
    // 医師主導治験
    return createTestInvestigatorInitiatedClinicalTrial_(testPatternIndex);
  }
  throw new Error(`Invalid test pattern index: ${testPatternIndex}`);
}
