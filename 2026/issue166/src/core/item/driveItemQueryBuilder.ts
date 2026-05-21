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
 * Copyright 2025 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export class DriveItemQueryBuilder {
  // ================= [設定エリア] =================
  private readonly filterMode: 'ALL' | 'PERIOD' | 'RECENT_2_DAYS' =
    'RECENT_2_DAYS';
  // 期間の範囲指定（useDateFilter が true の場合のみ有効）
  private readonly startYearsAgo = 1;
  private readonly endYearsAgo = 0; // 0にすると今日までになります
  // =================================================

  /**
   * 指定されたドライブ名に応じた、API探索用のクエリ文字列を組み立てる
   */
  public build(driveName: string): string {
    // 1. ベースとなる必須条件（ゴミ箱除外）
    const queryParts: string[] = ['trashed = false'];

    // 2. 選択されたモードに応じて日付クエリを生成
    if (this.filterMode === 'RECENT_2_DAYS') {
      // 💡 直近2日以内の計算（今日から2日前を計算）
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - 2);
      const formattedFromDate = Utilities.formatDate(
        fromDate,
        'GMT',
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      );

      queryParts.push(`modifiedTime > '${formattedFromDate}'`);
      console.log(
        `[Query Settings] ${driveName} から【直近2日以内（${formattedFromDate} 以降）】に更新されたアイテムを抽出します。`
      );
    } else if (this.filterMode === 'PERIOD') {
      // 従来の年数指定処理
      const fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - this.startYearsAgo);
      const formattedFromDate = Utilities.formatDate(
        fromDate,
        'GMT',
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      );

      const toDate = new Date();
      if (this.endYearsAgo > 0) {
        toDate.setFullYear(toDate.getFullYear() - this.endYearsAgo);
      }
      const formattedToDate = Utilities.formatDate(
        toDate,
        'GMT',
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      );

      queryParts.push(`modifiedTime > '${formattedFromDate}'`);
      queryParts.push(`modifiedTime < '${formattedToDate}'`);

      const periodText =
        this.endYearsAgo === 0 ? '今日まで' : `${this.endYearsAgo}年前まで`;
      console.log(
        `[Query Settings] ${driveName} から【${this.startYearsAgo}年前 〜 ${periodText}（${formattedFromDate} 〜 ${formattedToDate}）】に更新されたアイテムを抽出します。`
      );
    } else {
      // 全期間対象
      console.log(
        `[Query Settings] ${driveName} の【すべての期間】のアイテムを抽出します（日付絞り込み無効）。`
      );
    }

    // 3. クエリの結合
    return queryParts.join(' and ');
  }
}
