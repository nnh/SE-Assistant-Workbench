/**
 * Copyright 2023 Google LLC
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
// 共有ドライブ移動前後でのデータ比較用テストコード
import { cstNoGet } from './common';
export function testCompareDataBeforeAfterMove_(
  beforeSheetName: string,
  afterSheetName: string
) {
  const myDriveOwner =
    PropertiesService.getScriptProperties().getProperty('MY_DRIVE_OWNER');
  if (!myDriveOwner) {
    throw new Error('MY_DRIVE_OWNER is not set in Script Properties.');
  }
  const newDriveOwner =
    PropertiesService.getScriptProperties().getProperty('NEW_DRIVE_OWNER');
  if (!newDriveOwner) {
    throw new Error('NEW_DRIVE_OWNER is not set in Script Properties.');
  }
  const beforeSheet =
    SpreadsheetApp.getActive().getSheetByName(beforeSheetName);
  if (!beforeSheet) {
    throw new Error(`シート「${beforeSheetName}」が見つかりません。`);
  }
  const afterSheet = SpreadsheetApp.getActive().getSheetByName(afterSheetName);
  if (!afterSheet) {
    throw new Error(`シート「${afterSheetName}」が見つかりません。`);
  }
  const outputNoIdSheetName = '共有ドライブに存在しないIDまたはURL';
  let outputNoIdSheet =
    SpreadsheetApp.getActive().getSheetByName(outputNoIdSheetName);
  if (!outputNoIdSheet) {
    outputNoIdSheet =
      SpreadsheetApp.getActive().insertSheet(outputNoIdSheetName);
  } else {
    outputNoIdSheet.clearContents();
  }
  const outputEditorMismatchSheetName = '編集者不一致';
  let outputEditorMismatchSheet = SpreadsheetApp.getActive().getSheetByName(
    outputEditorMismatchSheetName
  );
  if (!outputEditorMismatchSheet) {
    outputEditorMismatchSheet = SpreadsheetApp.getActive().insertSheet(
      outputEditorMismatchSheetName
    );
  } else {
    outputEditorMismatchSheet.clearContents();
  }
  const outputViewerMismatchSheetName = '閲覧者不一致';
  let outputViewerMismatchSheet = SpreadsheetApp.getActive().getSheetByName(
    outputViewerMismatchSheetName
  );
  if (!outputViewerMismatchSheet) {
    outputViewerMismatchSheet = SpreadsheetApp.getActive().insertSheet(
      outputViewerMismatchSheetName
    );
  } else {
    outputViewerMismatchSheet.clearContents();
  }
  const headerEditor = [
    'タイプ',
    'パス',
    '名前',
    'ID',
    'URL',
    '移動前編集者',
    '移動後編集者',
  ];
  const headerViewer = [
    'タイプ',
    'パス',
    '名前',
    'ID',
    'URL',
    '移動前閲覧者',
    '移動後閲覧者',
  ];
  const beforeData = beforeSheet.getDataRange().getValues();
  const afterData = afterSheet.getDataRange().getValues();
  const nameIndex = 2; // 名前列のインデックス
  const idIndex = 3; // ID列のインデックス
  const urlIndex = 4; // URL列のインデックス
  const editorIndex = 8; // 編集者列のインデックス
  const viewerIndex = 9; // 閲覧者列のインデックス
  // beforeだけに存在するIDまたはURLを抽出
  const beforeOnly = beforeData.filter((beforeRow, idx) => {
    const beforeId = beforeRow[idIndex];
    const beforeUrl = beforeRow[urlIndex];
    return (
      (!afterData.some(afterRow => afterRow[idIndex] === beforeId) &&
        beforeId) ||
      (!afterData.some(afterRow => afterRow[urlIndex] === beforeUrl) &&
        beforeUrl) ||
      idx === 0
    );
  });
  outputNoIdSheet
    .getRange(1, 1, beforeOnly.length, beforeOnly[0].length)
    .setValues(beforeOnly);
  // 共有ドライブに移動済みのデータの確認
  const moveData = beforeData.filter((beforeRow, idx) => {
    const beforeId = beforeRow[idIndex];
    return (
      afterData.some(afterRow => afterRow[idIndex] === beforeId) || idx === 0
    );
  });
  const editorMismatch: string[][] = [];
  const viewerMismatch: string[][] = [];
  // 名前、編集者、閲覧者が違うものはないか
  moveData.forEach(beforeRow => {
    const beforeId = beforeRow[idIndex];
    const afterRow = afterData.find(row => row[idIndex] === beforeId);
    if (afterRow) {
      const beforeName = beforeRow[nameIndex];
      const afterName = afterRow[nameIndex];
      // 元のマイドライブのオーナーを除いた編集者リストと比較
      const beforeEditors = String(beforeRow[editorIndex])
        .split('\n')
        .map(editor =>
          editor === myDriveOwner || editor === newDriveOwner ? '' : editor
        )
        .filter(editor => editor !== '')
        .sort();
      // 共有ドライブのオーナーを除いた編集者リストと比較
      const afterEditors = String(afterRow[editorIndex])
        .split('\n')
        .map(editor => (editor === newDriveOwner ? '' : editor))
        .filter(editor => editor !== '')
        .sort();
      // 元のマイドライブのオーナーを除いた閲覧者リストと比較
      const beforeViewers = String(beforeRow[viewerIndex])
        .split('\n')
        .map(viewer =>
          viewer === myDriveOwner || viewer === newDriveOwner ? '' : viewer
        )
        .filter(viewer => viewer !== '')
        .sort();
      // 共有ドライブのオーナーを除いた閲覧者リストと比較
      const afterViewers = String(afterRow[viewerIndex])
        .split('\n')
        .map(viewer => (viewer === newDriveOwner ? '' : viewer))
        .filter(viewer => viewer !== '')
        .sort();
      // 編集者比較
      if (
        beforeEditors.length !== afterEditors.length ||
        !beforeEditors.every((value, index) => value === afterEditors[index])
      ) {
        const temp = [
          beforeRow[0], // タイプ
          beforeRow[1], // パス
          beforeRow[2], // 名前
          beforeRow[3], // ID
          beforeRow[4], // URL
          String(beforeRow[editorIndex]), // 移動前編集者
          String(afterRow[editorIndex]), // 移動後編集者
        ];
        editorMismatch.push(temp);
      }
      // 閲覧者比較
      if (
        beforeViewers.length !== afterViewers.length ||
        !beforeViewers.every((value, index) => value === afterViewers[index])
      ) {
        const temp = [
          beforeRow[0], // タイプ
          beforeRow[1], // パス
          beforeRow[2], // 名前
          beforeRow[3], // ID
          beforeRow[4], // URL
          String(beforeRow[viewerIndex]), // 移動前閲覧者
          String(afterRow[viewerIndex]), // 移動後閲覧者
        ];
        viewerMismatch.push(temp);
      }
      if (beforeName !== afterName) {
        throw new Error(
          `名前不一致 ID: ${beforeId} 共有ドライブ移動前: "${beforeName}" 共有ドライブ移動後: "${afterName}"`
        );
      }
    } else {
      throw new Error(
        `ID: ${beforeId} に対応する移動後データが見つかりません。`
      );
    }
  });
  outputEditorMismatchSheet.clearContents();
  outputViewerMismatchSheet.clearContents();
  if (editorMismatch.length > 0) {
    const outputValues = [headerEditor, ...editorMismatch];
    outputEditorMismatchSheet
      .getRange(1, 1, outputValues.length, headerEditor.length)
      .setValues(outputValues);
  } else {
    outputViewerMismatchSheet
      .getRange(1, 1)
      .setValue('✅ 共有ドライブ移動前後で編集者の不一致はありませんでした。');
    console.log('✅ 共有ドライブ移動前後で編集者の不一致はありませんでした。');
  }
  if (viewerMismatch.length > 0) {
    const outputValues = [headerViewer, ...viewerMismatch];
    outputViewerMismatchSheet
      .getRange(1, 1, outputValues.length, headerViewer.length)
      .setValues(outputValues);
  } else {
    outputViewerMismatchSheet
      .getRange(1, 1)
      .setValue('✅ 共有ドライブ移動前後で閲覧者の不一致はありませんでした。');
    console.log('✅ 共有ドライブ移動前後で閲覧者の不一致はありませんでした。');
  }
  console.log('✅ 共有ドライブ移動前後で名前の不一致はありませんでした。');
}

// 共有ドライブ移動テストのために指定したフォルダ配下のデータを抽出して別シートに出力する
export function testGetDataSinetInformation_(
  inputSheetName = '共有権限',
  outputSheetName = 'ISRテスト用',
  pathStartText = '情報システム研究室(ISR)/SINET'
) {
  const outputSheet =
    SpreadsheetApp.getActive().getSheetByName(outputSheetName);
  if (!outputSheet) {
    throw new Error(`シート「${outputSheetName}」が見つかりません。`);
  }
  const inputSheet = SpreadsheetApp.getActive().getSheetByName(inputSheetName);
  if (!inputSheet) {
    throw new Error(`シート「${inputSheetName}」が見つかりません。`);
  }
  outputSheet.clearContents();
  const data = inputSheet.getDataRange().getValues();
  const filtered = data.filter(
    (row, idx) =>
      (typeof row[1] === 'string' && row[1].startsWith(pathStartText)) ||
      idx === 0
  );
  outputSheet
    .getRange(1, 1, filtered.length, filtered[0].length)
    .setValues(filtered);
}
