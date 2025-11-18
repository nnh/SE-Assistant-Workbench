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
import { constIndexes, constSheetNames } from './const';
export const createTable_ = () => {
  const drivesInfoSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    constSheetNames.get('drivesInfo')!
  );
  if (!drivesInfoSheet) {
    throw new Error('DrivesInfo sheet not found.');
  }
  const permissionsInfoSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
      constSheetNames.get('permissionsInfo')!
    );
  if (!permissionsInfoSheet) {
    throw new Error('PermissionsInfo sheet not found.');
  }
  const drivesInfo = drivesInfoSheet.getDataRange().getValues();
  const permissionsInfo = permissionsInfoSheet.getDataRange().getValues();
  const drivesInfoKeyIndex = constIndexes.get('drives_driveid')!;
  const permissionsInfoKeyIndex = constIndexes.get('permissions_driveid')!;
  // Left join drivesInfo with permissionsInfo on driveid
  const mergedData: any[] = [];
  drivesInfo.forEach(driveRow => {
    const driveId = driveRow[drivesInfoKeyIndex];
    const matchingPermissionRows = permissionsInfo.filter(
      row => row[permissionsInfoKeyIndex] === driveId
    );
    if (matchingPermissionRows.length > 0) {
      matchingPermissionRows.forEach(permissionRow => {
        mergedData.push([...driveRow, ...permissionRow]);
      });
    } else {
      mergedData.push([
        ...driveRow,
        ...Array(permissionsInfo[0].length).fill(''),
      ]);
    }
  });
  const outputSheetName = 'list';
  let outputSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(outputSheetName);
  if (!outputSheet) {
    outputSheet =
      SpreadsheetApp.getActiveSpreadsheet().insertSheet(outputSheetName);
  } else {
    outputSheet.clear();
  }
  outputSheet
    .getRange(1, 1, mergedData.length, mergedData[0].length)
    .setValues(mergedData);
};
