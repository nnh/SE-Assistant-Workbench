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
/**
 * フィルタ行の抽出
 */
export const filterValidfiles_ = (data: string[][]): string[][] => {
  if (data.length <= 1) return data;

  const header = data[0];
  const filteredRows = data.slice(1).filter(row => {
    // A列が「フォルダ」以外は除外
    if (row[0] !== 'ファイル') return false;
    return true;
  });

  return [header, ...filteredRows];
};
