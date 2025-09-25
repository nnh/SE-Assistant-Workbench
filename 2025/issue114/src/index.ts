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
  arraySliceAndJoin_,
  getTargetTextArray_,
  getPurposeAndEndpoints_,
} from './test';

const inputTextMap = new Map<string, string>();

function main() {
  const targetTextArray: {
    text: string;
    heading: string;
  }[] = getTargetTextArray_();
  // 目的及び評価項目の取得
  const purposeAndEndpoints: Map<string, string[]> = getPurposeAndEndpoints_();
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
    setAnalysis_(/^[\d\\. ]*解析対象集団$/, targetTextArray, i, '解析対象集団');
    setAnalysis_(/^[\d\\. ]*統計解析$/, targetTextArray, i, '統計解析');
    setAnalysis_(/^[\d\\. ]*主要評価項目$/, targetTextArray, i, '主要評価項目');
    setAnalysis_(
      /^[\d\\. ]*副次的評価項目$/,
      targetTextArray,
      i,
      '副次的評価項目'
    );
    setAnalysis_(
      /^[\d\\. ]*探索的評価項目$/,
      targetTextArray,
      i,
      '探索的評価項目'
    );
    setAnalysis_(
      /^[\d\\. ]*他の安全性解析$/,
      targetTextArray,
      i,
      '他の安全性解析'
    );
    setAnalysis_(/^[\d\\. ]*その他の解析$/, targetTextArray, i, 'その他の解析');
    setAnalysis_(/^[\d\\. ]*中間解析$/, targetTextArray, i, '中間解析');
  }
  console.log('inputTextMap:', inputTextMap);
}
function setAnalysis_(
  targetHeading: RegExp,
  targetTextArray: { text: string; heading: string }[],
  i: number,
  key: string
): void {
  if (inputTextMap.has(key)) {
    return;
  }
  // 解析対象集団
  let startIdx = -1;
  let endIdx = -1;
  let res = '';
  if (
    targetHeading.test(targetTextArray[i].text) &&
    targetTextArray[i].heading !== 'NORMAL'
  ) {
    startIdx = i + 1;
  }
  if (startIdx === -1) {
    return;
  }
  for (let j = startIdx; j < targetTextArray.length; j++) {
    if (targetTextArray[j].heading !== 'NORMAL') {
      endIdx = j - 1;
      break;
    }
  }
  if (startIdx > -1 && endIdx === -1) {
    endIdx = targetTextArray.length - 1;
  }
  if (startIdx > -1 && endIdx > -1) {
    res = arraySliceAndJoin_(targetTextArray, startIdx, endIdx + 1);
    inputTextMap.set(key, res);
  }
}
// 選択基準、除外基準のセット
function setCriteriaExcusion_(
  targetTextArray: { text: string; heading: string }[],
  i: number
): void {
  if (inputTextMap.has('選択基準') && inputTextMap.has('除外基準')) {
    return;
  }
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
): void {
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
): void {
  if (inputTextMap.has(key)) {
    return;
  }
  if (array[index].text.startsWith(prefix)) {
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
): void {
  if (inputTextMap.has(key)) {
    return;
  }
  if (search.test(array[index].text)) {
    const value = array[index].text.replace(search, '').trim();
    inputTextMap.set(key, value);
  }
}

console.log(hello());
