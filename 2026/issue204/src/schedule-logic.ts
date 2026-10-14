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
// GAS API に依存しないロジック
// ※ GAS では関数名末尾が "_" の関数はプライベート扱いになるため、公開不要な関数には "_" を付けている
import {NO_BACKGROUND} from './constants';

/**
 * 試験名のセルに付ける色を決める。
 * - 試験名が空欄、または既に色が付いている（白以外）セルは変えない（null を返す）
 * - それ以外は行番号に応じてパレットから順番に選ぶ（隣り合う行は別の色になる）
 */
export function pickTrialColor_(
  row: number,
  name: string,
  currentBackground: string,
  palette: string[],
): string | null {
  if (name === '' || currentBackground.toLowerCase() !== NO_BACKGROUND) {
    return null;
  }
  return palette[(row - 2) % palette.length];
}
