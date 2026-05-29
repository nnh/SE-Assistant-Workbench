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
import * as Const from '../../common/const';
export class DriveItemQueryBuilder {
  // ================= [設定エリア] =================
  // 期間の範囲指定（引数で 'PERIOD' が指定された場合のみ有効）
  private readonly startYearsAgo = 1;
  private readonly endYearsAgo = 0;
  // =================================================

  /**
   * 指定されたドライブ名と抽出モードに応じた、API探索用のクエリ文字列を組み立てる
   * @param {string} driveName - 共有ドライブ名
   * @param {'ALL' | 'PERIOD' | 'RECENT_2_DAYS'} filterMode - 抽出条件
   */
  public build(
    driveName: string,
    filterMode: 'ALL' | 'PERIOD' | 'RECENT_2_DAYS'
  ): string {
    // 1. ベースとなる必須条件（ゴミ箱除外）
    const queryParts: string[] = ['trashed = false'];

    // 2. 引数で受け取った filterMode に応じて日付クエリを生成
    if (filterMode === Const.FILTER_MODE.RECENT_2_DAYS) {
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
    } else if (filterMode === Const.FILTER_MODE.PERIOD) {
      const fromDate = new Date();
      fromDate.setFullYear(fromDate.getFullYear() - this.startYearsAgo);
      const formattedFromDate = Utilities.formatDate(
        fromDate,
        'GMT',
        "yyyy-MM-dd'T'HH:mm:ss'Z'"
      );

      queryParts.push(`modifiedTime > '${formattedFromDate}'`);

      if (this.endYearsAgo > 0) {
        const toDate = new Date();
        toDate.setFullYear(toDate.getFullYear() - this.endYearsAgo);
        const formattedToDate = Utilities.formatDate(
          toDate,
          'GMT',
          "yyyy-MM-dd'T'HH:mm:ss'Z'"
        );
        queryParts.push(`modifiedTime < '${formattedToDate}'`);
        console.log(
          `[Query Settings] ${driveName} から【${this.startYearsAgo}年前 〜 ${this.endYearsAgo}年前まで（${formattedFromDate} 〜 ${formattedToDate}）】に更新されたアイテムを抽出します。`
        );
      } else {
        console.log(
          `[Query Settings] ${driveName} から【${this.startYearsAgo}年前 〜 今日まで（${formattedFromDate} 以降）】に更新されたアイテムを抽出します。`
        );
      }
    } else {
      console.log(
        `[Query Settings] ${driveName} の【すべての期間】のアイテムを抽出します（日付絞り込み無効）。`
      );
    }

    // 3. クエリの結合
    return queryParts.join(' and ');
  }
}
