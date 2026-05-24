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

export class JsonDataHandler {
  constructor(private jsonFolder: GoogleAppsScript.Drive.Folder) {}

  /** JSONファイルをパースして返す */
  public loadJsonFile<T>(file: GoogleAppsScript.Drive.File): T | null {
    try {
      const data: T = JSON.parse(file.getBlob().getDataAsString());
      return data;
    } catch (e) {
      console.error(`JSON parse error [${file.getName()}]: ${e}`);
      return null;
    }
  }

  /** 特定の接頭辞を持つJSONファイルを取得（最新の実行グループのみ） */
  public getTargetJsonFiles(
    prefix: string,
    targetDriveName: string
  ): GoogleAppsScript.Drive.File[] {
    const files = this.jsonFolder.getFiles();
    const targetFiles: GoogleAppsScript.Drive.File[] = [];
    const searchPrefix = `${prefix}_${targetDriveName}_`;

    while (files.hasNext()) {
      const file = files.next();
      if (
        file.getName().startsWith(searchPrefix) &&
        file.getName().endsWith('.json')
      ) {
        targetFiles.push(file);
      }
    }
    if (targetFiles.length === 0)
      throw new Error(`No JSON files found for: ${searchPrefix}`);

    // ファイル名から日時部分（yyyyMMdd_HHmm: 13文字）を抽出し、最新の実行グループのみを返す
    const DATE_TIME_LENGTH = 13;
    const latestDateTime = targetFiles.reduce((max, file) => {
      const dt = file
        .getName()
        .slice(searchPrefix.length, searchPrefix.length + DATE_TIME_LENGTH);
      return dt > max ? dt : max;
    }, '');

    return targetFiles
      .filter(
        file =>
          file
            .getName()
            .slice(
              searchPrefix.length,
              searchPrefix.length + DATE_TIME_LENGTH
            ) === latestDateTime
      )
      .sort((a, b) => a.getName().localeCompare(b.getName()));
  }

  /** 複数のJSONを統合 */
  public combineJsonData<T>(prefix: string, targetDriveName: string): T[] {
    const targetFiles = this.getTargetJsonFiles(prefix, targetDriveName);
    const combinedData: T[] = [];
    for (const file of targetFiles) {
      const data = this.loadJsonFile<T[]>(file);
      if (data && Array.isArray(data)) {
        combinedData.push(...data);
      }
    }
    return combinedData;
  }
}
