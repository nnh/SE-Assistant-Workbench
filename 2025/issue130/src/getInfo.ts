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
import { constSheetNames } from './const';
export function outputDrives_() {
  const drivesInfo = getDrivesInfo_();
  if (drivesInfo.length === 0) {
    console.log('No shared drives found.');
    return;
  }
  const drivesInfoSheetName = constSheetNames.get('drivesInfo');
  if (!drivesInfoSheetName) {
    throw new Error('DrivesInfo sheet name not found in constants.');
  }
  let outputSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName(drivesInfoSheetName);
  if (!outputSheet) {
    outputSheet =
      SpreadsheetApp.getActiveSpreadsheet().insertSheet(drivesInfoSheetName);
  } else {
    outputSheet.clear();
  }
  const headers = [
    'Drive Name',
    'Drive ID',
    'Drive Kind',
    'Created Time',
    '組織外のユーザーにファイルへのアクセスを許可する',
    '共有ドライブのメンバー以外のユーザーにファイルへのアクセスを許可する',
    'コンテンツ管理者にフォルダの共有を許可する',
    'ダウンロード、コピー、印刷できるユーザー：投稿者とコンテンツ管理者',
    'ダウンロード、コピー、印刷できるユーザー：閲覧者（コメント可）と閲覧者',
  ];
  const outputData = [headers, ...drivesInfo];
  outputSheet
    .getRange(1, 1, outputData.length, headers.length)
    .setValues(outputData);
}
export function outputPermissions_() {
  const drivesInfoSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('DrivesInfo');
  if (!drivesInfoSheet) {
    throw new Error(
      'DrivesInfo sheet not found. Please run outputDrives_ first.'
    );
  }
  const drivesInfo = drivesInfoSheet.getDataRange().getValues();
  if (drivesInfo.length < 2) {
    console.log('No drives information available to get permissions.');
    return;
  }
  const driveIdList = drivesInfo.slice(1).map(row => row[1] as string);
  const permissions = driveIdList.flatMap(driveId => getPermissions_(driveId));
  if (permissions.length === 0) {
    console.log('No permissions found for the drives.');
    return;
  }
  const headers = [
    'driveId',
    'id',
    'kind',
    '表示名',
    'ロール',
    'タイプ',
    'メールアドレス',
    'ファイルの検索を許可する',
    'ドメイン',
    '有効期限',
    '削除済み',
    'このユーザーの権限タイプ',
    'この権限が継承されるアイテムの ID',
    'このユーザーのメインのロール',
    'この権限が継承されているか',
  ];
  const permissionsInfoSheetName = constSheetNames.get('permissionsInfo');
  if (!permissionsInfoSheetName) {
    throw new Error('PermissionsInfo sheet name not found in constants.');
  }
  let outputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(
    permissionsInfoSheetName
  );
  if (!outputSheet) {
    outputSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(
      permissionsInfoSheetName
    );
  } else {
    outputSheet.clear();
  }
  outputSheet
    .getRange(1, 1, permissions.length + 1, headers.length)
    .setValues([headers, ...permissions]);
}
