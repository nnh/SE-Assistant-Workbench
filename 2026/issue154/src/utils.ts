/**
 * Copyright 2025 Google LLC
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
import * as consts from './consts';
/**
 * 実行に失敗する可能性がある処理をラップし、エラー時はデフォルト値を返します。
 * @template T - 実行する関数の戻り値の型
 * @param {function(): T} fn - 実行する関数
 * @returns {T | string} 関数が成功した場合はその戻り値、失敗した場合は '!取得不可!'
 */
export function safeGet_<T>(fn: () => T): T | string {
  try {
    return fn();
  } catch {
    // consts.LABEL.NO_GET は '!取得不可!' という文字列なので、戻り値の型は T | string になります
    return consts.LABEL.NO_GET;
  }
}
