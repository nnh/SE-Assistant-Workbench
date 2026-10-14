/**
 * Copyright 2026 Google LLC
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
import {pickTrialColor_} from '../src/schedule-logic';

describe('pickTrialColor_', () => {
  const palette = ['#1', '#2', '#3'];

  it('色が付いていない試験名のセルには、行番号に応じてパレットから順番に色を選ぶ', () => {
    expect(pickTrialColor_(2, 'A', '#ffffff', palette)).toBe('#1');
    expect(pickTrialColor_(3, 'B', '#FFFFFF', palette)).toBe('#2');
    expect(pickTrialColor_(5, 'C', '#ffffff', palette)).toBe('#1');
  });
  it('試験名が空欄、または既に色が付いているセルは変えない', () => {
    expect(pickTrialColor_(2, '', '#ffffff', palette)).toBeNull();
    expect(pickTrialColor_(2, 'A', '#ff0000', palette)).toBeNull();
  });
});
