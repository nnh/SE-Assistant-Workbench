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
const convertRoleToJapanese_ = (role: string): string => {
  switch (role) {
    case 'owner':
      return 'オーナー';
    case 'organizer':
      return '管理者';
    case 'fileOrganizer':
      return 'コンテンツ管理者';
    case 'writer':
      return '編集者';
    case 'commenter':
      return '閲覧者（コメント可）';
    case 'reader':
      return '閲覧者';
    default:
      return role;
  }
};
export const getPermissions_ = (targetId: string): string[][] => {
  let pageTokenPermission: string | undefined;
  const outputValues: string[][] = [];

  do {
    const params = {
      ...(pageTokenPermission !== undefined && {
        pageToken: pageTokenPermission,
      }),
      useDomainAdminAccess: true,
      includePermissionsForView: 'published',
      supportsAllDrives: true,
      pageSize: 50,
      fields:
        'permissions(id,type,kind,role,displayName,emailAddress,allowFileDiscovery,domain,expirationTime,deleted,permissionDetails),nextPageToken',
    };
    let permissions;
    try {
      permissions = Drive.Permissions.list(targetId, params);
    } catch (e) {
      console.log(`Failed to get permissions for Drive ID ${targetId}: ${e}`);
      const res = [Array(15).fill('')];
      res[0][0] = targetId;
      return res;
    }
    for (const permission of permissions.permissions || []) {
      const id = permission.id ?? '';
      const displayName = permission.displayName ?? '';
      const role =
        permission.role === undefined
          ? ''
          : convertRoleToJapanese_(permission.role);
      const type = permission.type ?? '';
      const kind = permission.kind ?? '';
      const emailAddress = permission.emailAddress ?? '';
      const allowFileDiscovery: string =
        permission.allowFileDiscovery === undefined
          ? ''
          : permission.allowFileDiscovery
            ? 'True'
            : 'False';
      const domain = permission.domain ?? '';
      const expirationTime = permission.expirationTime ?? '';
      const deleted: string =
        permission.deleted === undefined
          ? ''
          : permission.deleted
            ? 'True'
            : 'False';
      const permissionDetails = permission.permissionDetails?.map(detail => {
        const permissionType = detail.permissionType ?? '';
        const inheritedFrom = detail.inheritedFrom ?? '';
        const role =
          detail.role === undefined ? '' : convertRoleToJapanese_(detail.role);
        const inherited: string =
          detail.inherited === undefined
            ? ''
            : detail.inherited
              ? 'True'
              : 'False';
        return [permissionType, inheritedFrom, role, inherited];
      });
      const res = permissionDetails?.map(detail => [
        targetId,
        id,
        kind,
        displayName,
        role,
        type,
        emailAddress,
        allowFileDiscovery,
        domain,
        expirationTime,
        deleted,
        ...detail,
      ]);
      if (res === undefined) {
        throw new Error('Permission details are undefined');
      }
      outputValues.push(...res);
    }
    pageTokenPermission = permissions.nextPageToken;
  } while (pageTokenPermission);
  return outputValues;
};
