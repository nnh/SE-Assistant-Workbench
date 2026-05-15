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
import * as Const from './const';

export interface ListFilesOptions {
  driveId?: string;
  pageToken?: string;
  [key: string]: any;
}

export interface ListPermissionsOptions {
  fields: string;
  supportsAllDrives: boolean;
  [key: string]: any;
}

export const DriveApiService = {
  /** ファイル一覧取得 */
  fetchFiles(options: ListFilesOptions, maxRetries = 3) {
    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        const driveApi = (globalThis as any).Drive;
        return driveApi.Files.list(options);
      } catch (e) {
        if (++retryCount >= maxRetries) throw e;
        Utilities.sleep(Math.pow(2, retryCount) * 1000);
      }
    }
  },

  /** 権限一覧取得 */
  fetchPermissions(
    fileId: string,
    options: ListPermissionsOptions,
    maxRetries = 3
  ) {
    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        const driveApi = (globalThis as any).Drive;
        const result = driveApi.Permissions.list(fileId, options);
        return {
          kind: result?.kind || 'drive#permissionList',
          permissions: result?.permissions || [],
        };
      } catch (e) {
        if (++retryCount >= maxRetries)
          return { kind: 'drive#permissionList', permissions: [] };
        Utilities.sleep(Math.pow(2, retryCount) * 1000);
      }
    }
    return { kind: 'drive#permissionList', permissions: [] };
  },
  /** 共有ドライブ自体の情報取得 */
  fetchDriveInfo(driveId: string, maxRetries = 3) {
    let retryCount = 0;
    while (retryCount < maxRetries) {
      try {
        const driveApi = (globalThis as any).Drive;
        return driveApi.Drives.get(driveId, {
          fields: 'id, name, restrictions, capabilities',
        });
      } catch (e) {
        if (++retryCount >= maxRetries) throw e;
        Utilities.sleep(Math.pow(2, retryCount) * 1000);
      }
    }
  },
};
