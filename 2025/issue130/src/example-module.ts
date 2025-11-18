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
export function hello() {
  return 'Hello Apps Script!';
}
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
