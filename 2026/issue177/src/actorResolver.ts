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

export interface ActorInfo {
  /** people/{id} 形式のリソース名 */
  resourceName: string;
  /** 表示名 */
  displayName: string;
  /** メールアドレス（取得できない場合は空文字） */
  email: string;
}

/**
 * people/{id} 形式のリソース名リストからアカウント情報を一括取得する。
 * People API の batchGet は1回のリクエストで最大200件まで対応。
 *
 * @param resourceNames - people/{id} 形式のリソース名の配列
 * @returns リソース名をキーとした ActorInfo のマップ
 */
export function resolveActors_(
  resourceNames: string[]
): Map<string, ActorInfo> {
  const result = new Map<string, ActorInfo>();
  if (resourceNames.length === 0) return result;

  const response = People!.People!.getBatchGet({
    resourceNames,
    personFields: 'names,emailAddresses',
  });

  for (const entry of response.responses ?? []) {
    const resourceName = entry.requestedResourceName ?? '';
    const person = entry.person;
    result.set(resourceName, {
      resourceName,
      displayName: person?.names?.[0]?.displayName ?? '',
      email: person?.emailAddresses?.[0]?.value ?? '',
    });
  }

  return result;
}
