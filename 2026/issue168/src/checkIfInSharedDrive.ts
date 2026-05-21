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
export function getFilesInfo_(): void {
  const inputSheetName = Const.SHEET_NAME.AUDIT_LOG;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const inputSheet = ss.getSheetByName(inputSheetName);
  if (!inputSheet) {
    throw new Error(`「${inputSheetName}」シートが見つかりません。`);
  }
  const inputData: string[][] = inputSheet.getDataRange().getValues();
  // 一行目はヘッダーなので不要
  const targetIds: Set<string> = new Set();
  inputData.slice(1).forEach(row => {
    const fileId = row[1]; // 2列目にファイルIDがある想定
    if (fileId) {
      targetIds.add(fileId);
    }
  });
  targetIds.delete(''); // 空文字のIDを削除
  const outputValues: string[][] = [['ファイルID', '判定結果']]; // ヘッダー行
  const driveInfo = getSharedDriveIds_();
  targetIds.forEach(id => {
    const trimedId = id.trim();
    const result = checkIfInSharedDrive_(trimedId, driveInfo);
    outputValues.push([trimedId, result]);
  });
  const outputSheetName = Const.SHEET_NAME.FILE;
  let outputSheet = ss.getSheetByName(outputSheetName);
  if (!outputSheet) {
    outputSheet = ss.insertSheet(outputSheetName);
  } else {
    outputSheet.clear(); // 既存のデータをクリア
  }
  outputSheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}
function getSharedDriveIds_(): Map<string, string> {
  const targetSheetName = Const.SHEET_NAME.SHARED_DRIVE_ID;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(targetSheetName);
  if (!sheet) {
    throw new Error(`「${targetSheetName}」シートが見つかりません。`);
  }
  const driveInfo: Map<string, string> = new Map();
  const data: string[][] = sheet.getDataRange().getValues();
  data.forEach(row => {
    driveInfo.set(row[0], row[1]);
  });
  return driveInfo;
}
/**
 * 指定されたIDのファイルが「共有ドライブ」にあるかどうかを判定する
 * @param {string} fileId - 調べたいファイルまたはフォルダのID
 * @param {Map<string, string>} driveInfo - 共有ドライブの情報を格納したMap
 * @returns {boolean} 共有ドライブにある場合は true、マイドライブ等にある場合は false
 */
function checkIfInSharedDrive_(
  fileId: string,
  driveInfo: Map<string, string>
): string {
  if (!Drive) {
    throw new Error('Drive API サービスが有効になっていません。');
  }
  try {
    const file = Drive.Files.get(fileId, {
      supportsAllDrives: true,
      fields: 'id, name, driveId', // 必要なフィールドだけを指定して軽量化
    }) as any;
    if (!file) {
      throw new Error('ファイルが見つかりません。IDを確認してください。');
    }

    // driveId が存在していれば「共有ドライブ」にあると判定できる
    if (file.driveId) {
      const driveName =
        driveInfo.get(file.driveId) || '？？？不明なドライブ名？？？';
      return `共有ドライブ「${driveName}」`;
    } else {
      return `マイドライブ`;
    }
  } catch (e: any) {
    return `[Error] ファイル情報の取得に失敗しました（IDが違うか、権限がありません）: ${e.message}`;
  }
}
