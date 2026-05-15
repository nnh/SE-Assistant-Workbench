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
import { DateUtils } from './utils';

/**
 * ファイル操作に関する共通ユーティリティ
 */
export const FileUtils = {
  /**
   * JSONアーカイブ用の標準的なファイル名を生成する
   * @param prefix 接頭辞 (例: 'フォルダ構成')
   * @param driveName 共有ドライブ名
   * @param batch バッチ番号 (1, 2, 3...)
   * @param date 日付オブジェクト（デフォルトは現在時刻）
   */
  generateJsonFileName(
    prefix: string,
    driveName: string,
    batch = 1,
    date: Date = new Date()
  ): string {
    const dateStr = DateUtils.getFormattedDate(date, 'yyyyMMdd_HHmm');
    const part = batch.toString().padStart(3, '0');

    // ファイル名に使えない禁止文字をアンダースコアに置換
    const safeDriveName = this.sanitizeFileName(driveName);

    return `${prefix}_${safeDriveName}_${dateStr}_p${part}.json`;
  },

  /**
   * OSやGoogleドライブで問題になりやすい記号を置換する
   */
  sanitizeFileName(name: string): string {
    return name.replace(/[\\/:*?"<>|]/g, '_');
  },
} as const;
