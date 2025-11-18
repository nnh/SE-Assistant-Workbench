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
export const getDrivesInfo_ = (): string[][] => {
  let pageTokenDrive: string | undefined;
  const outputValues: string[][] = [];

  let drivesList;
  do {
    const params = {
      ...(pageTokenDrive !== undefined && { pageToken: pageTokenDrive }),
      pageSize: 50,
      useDomainAdminAccess: true,
      fields:
        'drives(id,name,kind,createdTime,restrictions(copyRequiresWriterPermission,domainUsersOnly,driveMembersOnly,adminManagedRestrictions,sharingFoldersRequiresOrganizerPermission,downloadRestriction))',
    };
    drivesList = Drive.Drives.list(params);
    if (drivesList.drives && drivesList.drives.length > 0) {
      for (const drive of drivesList.drives) {
        const driveId = drive.id;
        if (driveId === undefined) {
          throw new Error('Drive ID is undefined');
        }
        const driveName = drive.name ?? '';
        const drivekind = drive.kind ?? '';
        const driveCreatedTime = drive.createdTime ?? '';
        const restrictions = getRestrictionsString_(
          drive.restrictions ??
            ({} as GoogleAppsScript.Drive_v3.Drive.V3.Schema.DriveRestrictions)
        );
        outputValues.push([
          driveName,
          driveId,
          drivekind,
          driveCreatedTime,
          ...restrictions,
        ]);
      }
    }
    pageTokenDrive = drivesList.nextPageToken;
  } while (pageTokenDrive);

  return outputValues;
};

const getRestrictionsString_ = (
  restrictions: GoogleAppsScript.Drive_v3.Drive.V3.Schema.DriveRestrictions
): string[] => {
  const adminManagedRestrictions = (restrictions as Record<string, any>)[
    'adminManagedRestrictions'
  ];
  const adminManagedRestrictionsStr: string =
    adminManagedRestrictions === undefined
      ? ''
      : adminManagedRestrictions
        ? '許可しない'
        : '許可する';
  const domainUsersOnly = (restrictions as Record<string, any>)[
    'domainUsersOnly'
  ];
  const domainUsersOnlyStr: string =
    domainUsersOnly === undefined
      ? ''
      : domainUsersOnly
        ? '許可しない'
        : '許可する';
  const driveMembersOnly = (restrictions as Record<string, any>)[
    'driveMembersOnly'
  ];
  const driveMembersOnlyStr: string =
    driveMembersOnly === undefined
      ? ''
      : driveMembersOnly
        ? '許可しない'
        : '許可する';
  const sharingFoldersRequiresOrganizerPermission = (
    restrictions as Record<string, boolean | object>
  )['sharingFoldersRequiresOrganizerPermission'];
  const sharingFoldersRequiresOrganizerPermissionStr: string =
    sharingFoldersRequiresOrganizerPermission === undefined
      ? ''
      : sharingFoldersRequiresOrganizerPermission
        ? '許可しない'
        : '許可する';
  const copyRequiresWriterPermission = (
    restrictions as Record<string, boolean | object>
  )['copyRequiresWriterPermission'];
  const copyRequiresWriterPermissionStr: string =
    copyRequiresWriterPermission === undefined
      ? ''
      : copyRequiresWriterPermission
        ? '許可しない'
        : '許可する';
  const downloadRestriction =
    ((restrictions as Record<string, any>)['downloadRestriction'] as {
      restrictedForReaders?: boolean;
      restrictedForWriters?: boolean;
    }) || {};
  const restrictedForReaders = downloadRestriction.restrictedForReaders;
  const restrictedForWriters = downloadRestriction.restrictedForWriters;
  const restrictedForReadersStr: string =
    restrictedForReaders === undefined
      ? ''
      : restrictedForReaders
        ? '許可しない'
        : '許可する';
  const restrictedForWritersStr: string =
    restrictedForWriters === undefined
      ? ''
      : restrictedForWriters
        ? '許可しない'
        : '許可する';
  const res = [
    adminManagedRestrictionsStr,
    domainUsersOnlyStr,
    driveMembersOnlyStr,
    sharingFoldersRequiresOrganizerPermissionStr,
    restrictedForWritersStr,
    restrictedForReadersStr,
  ];
  return res;
};
