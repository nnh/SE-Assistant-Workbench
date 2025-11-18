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
import { getDrivesInfo_ } from './getDrives';
import { getPermissions_ } from './getPermissions';
export function hello() {
  return 'Hello Apps Script!';
}
export function outputDrives_() {
  const drivesInfo = getDrivesInfo_();
  if (drivesInfo.length === 0) {
    console.log('No shared drives found.');
    return;
  }
  let outputSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DrivesInfo');
  if (!outputSheet) {
    outputSheet =
      SpreadsheetApp.getActiveSpreadsheet().insertSheet('DrivesInfo');
  } else {
    outputSheet.clear();
  }
  const headers = [
    'Drive Name',
    'Drive ID',
    'Drive Kind',
    'Created Time',
    'Copy Requires Writer Permission',
    'Domain Users Only',
    'Drive Members Only',
    'Admin Managed Restrictions',
    'Sharing Folders Requires Organizer Permission',
  ];
  const outputData = [headers, ...drivesInfo];
  outputSheet
    .getRange(1, 1, outputData.length, headers.length)
    .setValues(outputData);
}
export function outputPermissions_() {
  const permissions = getPermissions_('0AC5DqmSREyx8Uk9PVA');
  const headers = [
    'driveId',
    'id',
    'displayName',
    'role',
    'type',
    'emailAddress',
    'allowFileDiscovery',
    'domain',
    'expirationTime',
    'deleted',
    'detail.permissionType',
    'detail.inheritedFrom',
    'detail.role',
    'detail.inherited',
  ];
  let outputSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('PermissionsInfo');
  if (!outputSheet) {
    outputSheet =
      SpreadsheetApp.getActiveSpreadsheet().insertSheet('PermissionsInfo');
  } else {
    outputSheet.clear();
  }
  outputSheet
    .getRange(1, 1, permissions.length + 1, headers.length)
    .setValues([headers, ...permissions]);
}
/*
export function test_() {
  let pageTokenDrive: string | undefined;
  const outputValues: string[][] = [];

  let drivesList;
  do {
    drivesList = Drive.Drives.list({
      ...(pageTokenDrive !== undefined && { pageToken: pageTokenDrive }),
      pageSize: 100,
      useDomainAdminAccess: true,
    });
    if (drivesList.drives && drivesList.drives.length > 0) {
      for (const drive of drivesList.drives) {
        const driveName = drive.name;
        const driveId = drive.id;
        if (driveId === undefined) {
          throw new Error('Drive ID is undefined');
        }
        const permissions = Drive.Permissions.list(driveId, {
          supportsAllDrives: true,
        });
        for (const permission of permissions.permissions || []) {
          const displayName = permission.displayName;
          const role = permission.role;
          const type = permission.type;
          const emailAddress = permission.emailAddress;
          console.log(
            `Drive Name: ${driveName}, Drive ID: ${driveId}, Role: ${role}, Type: ${type}, Email: ${emailAddress}`
          );
        }

        outputValues.push([driveName ?? '', driveId ?? '']);
      }
    }
    pageTokenDrive = drivesList.nextPageToken;
  } while (pageTokenDrive);

  console.log(outputValues);
}
*/
