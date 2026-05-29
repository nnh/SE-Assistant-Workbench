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

interface DriveItem {
  parents?: string[];
}

export class DrivePathResolver {
  // パス計算用のキャッシュ (ID -> フルパス) をクラス内部に隠蔽
  private pathCache: Map<string, string> = new Map();

  /**
   * アイテムが存在する「親フォルダ」のフルパスを再帰的に構築する
   * @param {DriveItem} item - 対象のアイテムオブジェクト
   * @returns {string} ルートからのフルパス文字列
   */
  public resolve(item: DriveItem): string {
    const parentId =
      item.parents && item.parents.length > 0 ? item.parents[0] : null;

    // 親がいない（ドライブ直下など）場合は空文字を返す
    if (!parentId) return '';

    // 親のパスが既にキャッシュにあればそれを返す
    if (this.pathCache.has(parentId)) {
      return this.pathCache.get(parentId) as string;
    }

    // キャッシュにない場合（再帰的に親を辿る）
    try {
      const parentFolder: GoogleAppsScript.Drive.Folder =
        DriveApp.getFolderById(parentId);

      // 親自身のフルパスを構築
      const parentName = parentFolder.getName();
      const parentIterator = parentFolder.getParents();
      const grandParentId = parentIterator.hasNext()
        ? parentIterator.next().getId()
        : null;

      // 再帰呼び出し：親の親のパス + 親の名前
      const grandParentPath = this.resolve({
        parents: grandParentId ? [grandParentId] : [],
      });

      const fullParentPath = grandParentPath
        ? `${grandParentPath} / ${parentName}`
        : parentName;

      // キャッシュに保存
      this.pathCache.set(parentId, fullParentPath);
      return fullParentPath;
    } catch (e) {
      return 'Unknown';
    }
  }

  /**
   * キャッシュをクリアする
   */
  public clear(): void {
    this.pathCache.clear();
  }
}
