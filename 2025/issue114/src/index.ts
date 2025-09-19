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
  getDocByPropertyKey_,
  getTabsFromDoc_,
  arraySliceAndJoin_,
  getTargetTextArray_,
} from './test';

const inputTextMap = new Map<string, string>();

function main() {
  const targetTextArray: {
    text: string;
    heading: string;
  }[] = getTargetTextArray_();
  for (let i = 0; i < targetTextArray.length; i++) {
    if (
      /^[\w\s\p{P}]+$/u.test(targetTextArray[i].text) &&
      !inputTextMap.has('試験名')
    ) {
      inputTextMap.set('試験名（英語）', targetTextArray[i].text);
      inputTextMap.set('試験名', i > 0 ? targetTextArray[i - 1].text : '');
    }
    setValueIfStartsWith_(
      'プロトコルID',
      '研究計画書番号:',
      targetTextArray,
      i
    );
    setValueIfStartsWith_('研究代表医師', '研究代表医師：', targetTextArray, i);

    if (new RegExp('試験治療期間').test(targetTextArray[i].text)) {
      setNextText_('試験治療期間', targetTextArray, i);
    }
    setValueIfIncludes_('有効成分名', /.*?一般名：/, targetTextArray, i);
    setValueIfIncludes_('商品名', /.*?商品名：/, targetTextArray, i);
    if (targetTextArray[i].text.trim() === '目標症例数') {
      setNextText_('目標症例数', targetTextArray, i);
      const tempCaseCount = inputTextMap.get('目標症例数') || '';
      const caseCount = tempCaseCount.replace(/\D/g, '');
      inputTextMap.set('目標症例数', caseCount);
    }
    if (targetTextArray[i].text.trim() === '研究デザインの概要') {
      setNextText_('研究デザインの概要', targetTextArray, i);
      const designSummary = inputTextMap.get('研究デザインの概要') || '';
      const phaseMatch = designSummary.match(/第(.+?)相試験/);
      if (phaseMatch) {
        inputTextMap.set('開発のフェーズ', phaseMatch[0]);
      }
    }
    setCriteriaExcusion_(targetTextArray, i);
  }
  console.log('inputTextMap:', inputTextMap);
}
// 選択基準、除外基準のセット
function setCriteriaExcusion_(
  targetTextArray: { text: string; heading: string }[],
  i: number
) {
  if (
    /^[\d\\. ]*選択基準$/.test(targetTextArray[i].text) &&
    targetTextArray[i].heading !== 'NORMAL'
  ) {
    const selectionStartIdx = i + 1;
    let exclusionStartIdx = -1;
    let selectionEndIdx = -1;
    for (let j = selectionStartIdx; j < targetTextArray.length; j++) {
      if (
        /^[\d\\. ]*除外基準$/.test(targetTextArray[j].text) &&
        targetTextArray[j].heading !== 'NORMAL'
      ) {
        exclusionStartIdx = j + 1;
        selectionEndIdx = j - 1;
        break;
      }
    }
    let exclusionEndIdx = -1;
    if (exclusionStartIdx > -1) {
      for (let k = exclusionStartIdx + 1; k < targetTextArray.length; k++) {
        if (targetTextArray[k].heading !== 'NORMAL') {
          exclusionEndIdx = k - 1;
          break;
        }
      }
      if (exclusionEndIdx > exclusionStartIdx) {
        const exclusionCriteria = arraySliceAndJoin_(
          targetTextArray,
          exclusionStartIdx,
          exclusionEndIdx + 1
        );
        inputTextMap.set('除外基準', exclusionCriteria);
      }
      if (selectionEndIdx > selectionStartIdx) {
        const selectionCriteria = arraySliceAndJoin_(
          targetTextArray,
          selectionStartIdx,
          selectionEndIdx + 1
        );
        inputTextMap.set('選択基準', selectionCriteria);
      }
    }
  }
}
function setNextText_(
  key: string,
  array: {
    text: string;
    heading: string;
  }[],
  index: number
) {
  if (inputTextMap.has(key)) {
    return;
  }
  inputTextMap.set(key, index < array.length ? array[index + 1].text : '');
}
function setValueIfStartsWith_(
  key: string,
  prefix: string,
  array: {
    text: string;
    heading: string;
  }[],
  index: number
) {
  if (array[index].text.startsWith(prefix) && !inputTextMap.has(key)) {
    const value = array[index].text.replace(prefix, '').trim();
    inputTextMap.set(key, value);
  }
}
function setValueIfIncludes_(
  key: string,
  search: RegExp,
  array: {
    text: string;
    heading: string;
  }[],
  index: number
) {
  if (search.test(array[index].text) && !inputTextMap.has(key)) {
    const value = array[index].text.replace(search, '').trim();
    inputTextMap.set(key, value);
  }
}

console.log(hello());
