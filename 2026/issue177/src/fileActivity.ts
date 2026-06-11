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
import {
  ActorInfo,
  resolveActors_ as resolveActorDetails_,
} from './actorResolver';

export { ActorInfo };

/** 整形済みのアクティビティ情報 */
export interface FileActivityRecord {
  /** アクティビティの種類 */
  type: 'edit' | 'create' | 'comment' | 'other';
  /** アクティビティの発生日時 */
  timestamp: string;
  /** 操作したユーザーのリソース名（people/{id} 形式） */
  actorResourceNames: string[];
  /** 操作したユーザーのアカウント情報（resolveActorInfo_ 呼び出し後に設定） */
  actors: ActorInfo[];
}

type ActivityDetail =
  | GoogleAppsScript.DriveActivity.Schema.ActionDetail
  | undefined;

/** アクションの種類を判定する */
function resolveType_(detail: ActivityDetail): FileActivityRecord['type'] {
  if (!detail) return 'other';
  if (detail.edit) return 'edit';
  if (detail.create) return 'create';
  if (detail.comment) return 'comment';
  return 'other';
}

/** アクティビティからタイムスタンプを取得する */
function resolveTimestamp_(
  activity: GoogleAppsScript.DriveActivity.Schema.DriveActivity
): string {
  return (
    activity.timestamp ??
    activity.timeRange?.startTime ??
    activity.timeRange?.endTime ??
    ''
  );
}

/** アクティビティから操作者のリソース名リストを取得する */
function extractActorResourceNames_(
  activity: GoogleAppsScript.DriveActivity.Schema.DriveActivity
): string[] {
  return (activity.actors ?? [])
    .map(a => a.user?.knownUser?.personName ?? '')
    .filter(name => name !== '');
}

/**
 * 指定したファイルIDの操作履歴（閲覧・編集）を取得する。
 *
 * @param fileId - Google Drive のファイルID
 * @param pageSize - 1回のリクエストで取得する件数（最大100）
 * @returns アクティビティ一覧
 */
export function getFileActivity_(
  fileId: string,
  pageSize = 100
): FileActivityRecord[] {
  const results: FileActivityRecord[] = [];
  let pageToken: string | undefined;

  do {
    const response = DriveActivity!.Activity!.query({
      itemName: `items/${fileId}`,
      pageSize,
      pageToken,
    });

    for (const activity of response.activities ?? []) {
      results.push({
        type: resolveType_(activity.primaryActionDetail),
        timestamp: resolveTimestamp_(activity),
        actorResourceNames: extractActorResourceNames_(activity),
        actors: [],
      });
    }

    pageToken = response.nextPageToken ?? undefined;
  } while (pageToken);

  return results;
}

/**
 * アクティビティのアクター情報を People API で解決して actors フィールドに設定する。
 *
 * @param records - getFileActivity_ の返り値
 * @returns actors が設定された records（同一参照）
 */
export function resolveActorInfo_(
  records: FileActivityRecord[]
): FileActivityRecord[] {
  const allResourceNames = [
    ...new Set(records.flatMap(r => r.actorResourceNames)),
  ];
  const infoMap = resolveActorDetails_(allResourceNames);

  for (const record of records) {
    record.actors = record.actorResourceNames.map(
      name =>
        infoMap.get(name) ?? { resourceName: name, displayName: '', email: '' }
    );
  }
  return records;
}

/**
 * 編集履歴のみを取得する。
 *
 * @param fileId - Google Drive のファイルID
 */
export function getEditHistory_(fileId: string): FileActivityRecord[] {
  return getFileActivity_(fileId).filter(a => a.type === 'edit');
}
