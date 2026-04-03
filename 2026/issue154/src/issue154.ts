//const targetFolderId = '104sxr5MYFDGwnqnNlMjuzuTD9UjsVI0E';
const root = '';
const cstNoGet = '!取得不可!';
const cstMoveBeforeDataSheetName = '共有権限';
function safeGet_(fn: () => any): any {
  try {
    return fn();
  } catch {
    return cstNoGet;
  }
}

function getDataInformation_(data: any): any[] {
  const name = data.getName();
  const id = data.getId();
  const url = data.getUrl();
  const accessClass = safeGet_(() => String(data.getSharingAccess()));
  const perm = safeGet_(() => String(data.getSharingPermission()));
  const owner = safeGet_(() => data.getOwner()?.getEmail() ?? '');
  const editors = safeGet_(() =>
    data
      .getEditors()
      .map((e: any) => e.getEmail())
      .join('\n')
  );
  const viewers = safeGet_(() =>
    data
      .getViewers()
      .map((v: any) => v.getEmail())
      .join('\n')
  );
  const shortcutFolderId = safeGet_(() => {
    try {
      const getFileTry = DriveApp.getFileById(data.getId());
    } catch (e) {
      return '';
    }
    const targetFile = DriveApp.getFileById(data.getId());
    const mimeType = targetFile.getMimeType();
    if (mimeType !== 'application/vnd.google-apps.shortcut') {
      return '';
    }
    const targetId = targetFile.getTargetId();
    if (targetId === null || targetId === undefined) {
      return '';
    }
    return targetId;
  });
  return [
    name,
    id,
    url,
    accessClass,
    perm,
    owner,
    editors,
    viewers,
    shortcutFolderId,
  ];
}

const getRootFolder_ = () => {
  const folderId =
    PropertiesService.getScriptProperties().getProperty('TARGET_FOLDER_ID');
  if (!folderId) {
    throw new Error('TARGET_FOLDER_ID is not set in Script Properties.');
  }
  return DriveApp.getFolderById(folderId);
};
export function exportFolderPermissionsRecursive_() {
  let processedAllCount = 0;
  const rootFolder = getRootFolder_();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const resultSheet =
    ss.getSheetByName(cstMoveBeforeDataSheetName) ||
    ss.insertSheet(cstMoveBeforeDataSheetName);
  const doneSheet = ss.getSheetByName('検索済み') || ss.insertSheet('検索済み');
  doneSheet.getRange(1, 1, 1, 2).setValues([['ID', 'パス']]);
  const processedIds = new Set(
    doneSheet.getRange('A2:A').getValues().flat().filter(String)
  );
  const header = [
    [
      'タイプ',
      'パス',
      '名前',
      'ID',
      'URL',
      'アクセス種別',
      '権限',
      'オーナー',
      '編集者',
      '閲覧者',
      'ショートカット元フォルダID',
    ],
  ];
  resultSheet.getRange(1, 1, 1, header[0].length).setValues(header);
  const flushBatch = (outputValues: string[][], processedCount: number) => {
    if (outputValues.length > 0) {
      resultSheet
        .getRange(
          resultSheet.getLastRow() + 1,
          1,
          outputValues.length,
          outputValues[0].length
        )
        .setValues(outputValues);
      console.log(
        `✅ ${processedCount}件処理完了（${outputValues.length}件をバッチ書き出し）`
      );
      processedAllCount += processedCount;
      SpreadsheetApp.flush();
    }
  };
  const processFolder = (
    folder: GoogleAppsScript.Drive.Folder,
    path: string
  ) => {
    const outputValues = [];
    let processedCount = 0;
    const folderId = folder.getId();
    if (!processedIds.has(folderId)) {
      outputValues.push(['フォルダ', path, ...getDataInformation_(folder)]);
      processedIds.add(folderId);
      processedCount++;
      console.log(`対象フォルダ: ${path}`);
    } else {
      processedIds.delete(folderId);
    }
    const doneFileData = [];
    const files = folder.getFiles();
    while (files.hasNext()) {
      const file = files.next();
      const fileId = file.getId();
      if (!processedIds.has(fileId)) {
        outputValues.push(['ファイル', path, ...getDataInformation_(file)]);
        doneFileData.push([fileId, path]);
        processedIds.add(fileId);
        processedCount++;
      } else {
        processedIds.delete(fileId);
      }
    }
    flushBatch(outputValues, processedCount);
    const doneData = [[folderId, path], ...doneFileData];
    if (doneData.length > 0) {
      doneSheet
        .getRange(
          doneSheet.getLastRow() + 1,
          1,
          doneData.length,
          doneData[0].length
        )
        .setValues(doneData);
    }
    const subFolders = folder.getFolders();
    while (subFolders.hasNext()) {
      const sub = subFolders.next();
      processFolder(sub, `${path}/${sub.getName()}`);
    }
  };
  console.log(`📂 探索開始: ${rootFolder.getName()}`);
  processFolder(rootFolder, rootFolder.getName());
  console.log(`🎉 全処理完了。合計: ${processedAllCount}件`);
  const targetPath = resultSheet.getRange(2, 2).getValue();
  PropertiesService.getScriptProperties().setProperty(
    'TARGET_PATH',
    targetPath
  );
}

function testCompareDataBeforeAfterMove_(
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
  const outputPermissionMismatchSheetName = '権限不一致';
  let outputPermissionMismatchSheet = SpreadsheetApp.getActive().getSheetByName(
    outputPermissionMismatchSheetName
  );
  if (!outputPermissionMismatchSheet) {
    outputPermissionMismatchSheet = SpreadsheetApp.getActive().insertSheet(
      outputPermissionMismatchSheetName
    );
  } else {
    outputPermissionMismatchSheet.clearContents();
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
  const headerPermission = [
    'タイプ',
    'パス',
    '名前',
    'ID',
    'URL',
    '移動前アクセス種別',
    '移動後アクセス種別',
    '移動前権限',
    '移動後権限',
  ];
  const beforeData: string[][] = beforeSheet.getDataRange().getValues();
  const afterData: string[][] = afterSheet.getDataRange().getValues();
  const nameIndex = 2;
  const idIndex = 3;
  const urlIndex = 4;
  const accessClassIndex = 5;
  const permIndex = 6;
  const editorIndex = 8;
  const viewerIndex = 9;
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
  const moveData = beforeData.filter((beforeRow, idx) => {
    const beforeId = beforeRow[idIndex];
    return (
      afterData.some(afterRow => afterRow[idIndex] === beforeId) || idx === 0
    );
  });
  const editorMismatch: string[][] = [];
  const viewerMismatch: string[][] = [];
  const permissionMismatch: string[][] = [];
  moveData.forEach(beforeRow => {
    const beforeId = beforeRow[idIndex];
    const afterRow = afterData.find(row => row[idIndex] === beforeId);
    if (afterRow) {
      const beforeName = beforeRow[nameIndex];
      const afterName = afterRow[nameIndex];
      const beforeEditors = String(beforeRow[editorIndex])
        .split('\n')
        .map(editor =>
          editor === myDriveOwner || editor === newDriveOwner ? '' : editor
        )
        .filter(editor => editor !== '')
        .sort();
      const afterEditors = String(afterRow[editorIndex])
        .split('\n')
        .map(editor => (editor === newDriveOwner ? '' : editor))
        .filter(editor => editor !== '')
        .sort();
      const beforeViewers = String(beforeRow[viewerIndex])
        .split('\n')
        .map(viewer =>
          viewer === myDriveOwner || viewer === newDriveOwner ? '' : viewer
        )
        .filter(viewer => viewer !== '')
        .sort();
      const afterViewers = String(afterRow[viewerIndex])
        .split('\n')
        .map(viewer => (viewer === newDriveOwner ? '' : viewer))
        .filter(viewer => viewer !== '')
        .sort();
      if (
        beforeEditors.length !== afterEditors.length ||
        !beforeEditors.every((value, index) => value === afterEditors[index])
      ) {
        const temp = [
          beforeRow[0],
          beforeRow[1],
          beforeRow[2],
          beforeRow[3],
          beforeRow[4],
          String(beforeRow[editorIndex]),
          String(afterRow[editorIndex]),
        ];
        editorMismatch.push(temp);
      }
      if (
        beforeViewers.length !== afterViewers.length ||
        !beforeViewers.every((value, index) => value === afterViewers[index])
      ) {
        const temp = [
          beforeRow[0],
          beforeRow[1],
          beforeRow[2],
          beforeRow[3],
          beforeRow[4],
          String(beforeRow[viewerIndex]),
          String(afterRow[viewerIndex]),
        ];
        viewerMismatch.push(temp);
      }
      const beforeAccessClass = String(beforeRow[accessClassIndex]);
      const afterAccessClass = String(afterRow[accessClassIndex]);
      const beforePerm = String(beforeRow[permIndex]);
      const afterPerm = String(afterRow[permIndex]);
      let isMismatch = false;
      if (beforeAccessClass === cstNoGet) {
        if (afterAccessClass !== 'ANYONE_WITH_LINK') {
          isMismatch = true;
        }
      } else {
        if (afterAccessClass === cstNoGet) {
          isMismatch = true;
        }
      }
      if (isMismatch) {
        permissionMismatch.push([
          beforeRow[0],
          beforeRow[1],
          beforeRow[2],
          beforeRow[3],
          beforeRow[4],
          beforeAccessClass,
          afterAccessClass,
          beforePerm,
          afterPerm,
        ]);
      }
      if (String(beforeName) !== String(afterName)) {
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
    outputEditorMismatchSheet
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
  if (permissionMismatch.length > 0) {
    const outputValues = [headerPermission, ...permissionMismatch];
    outputPermissionMismatchSheet
      .getRange(1, 1, outputValues.length, headerPermission.length)
      .setValues(outputValues);
  } else {
    outputPermissionMismatchSheet
      .getRange(1, 1)
      .setValue('✅ 共有ドライブ移動前後で権限の不一致はありませんでした。');
    console.log('✅ 共有ドライブ移動前後で権限の不一致はありませんでした。');
  }
}
function testGetDataInformation_(
  inputSheetName: string,
  outputSheetName: string,
  pathStartText: string
) {
  const inputSpreadSheetId =
    PropertiesService.getScriptProperties().getProperty(
      'BEFORE_SPREADSHEET_ID'
    );
  if (!inputSpreadSheetId) {
    throw new Error('BEFORE_SPREADSHEET_ID is not set in Script Properties.');
  }
  const inputSpreadsheet = SpreadsheetApp.openById(inputSpreadSheetId);
  const inputSheet = inputSpreadsheet.getSheetByName(inputSheetName);
  if (!inputSheet) {
    throw new Error(`シート「${inputSheetName}」が見つかりません。`);
  }
  let outputSheet = SpreadsheetApp.getActive().getSheetByName(outputSheetName);
  if (!outputSheet) {
    outputSheet = SpreadsheetApp.getActive().insertSheet(outputSheetName);
  } else {
    outputSheet.clearContents();
  }
  outputSheet.clearContents();
  const data: string[][] = inputSheet.getDataRange().getValues();
  const filtered = data.filter(
    (row, idx) =>
      (typeof row[1] === 'string' && row[1].startsWith(pathStartText)) ||
      idx === 0
  );
  outputSheet
    .getRange(1, 1, filtered.length, filtered[0].length)
    .setValues(filtered);
}

function setScriptProperties_(targetFolderId: string) {
  PropertiesService.getScriptProperties().setProperty(
    'TARGET_FOLDER_ID',
    targetFolderId
  );
  PropertiesService.getScriptProperties().setProperty(
    'MY_DRIVE_OWNER',
    'saito.toshiki@nnh.go.jp'
  );
  PropertiesService.getScriptProperties().setProperty(
    'NEW_DRIVE_OWNER',
    'research.center@nnh.go.jp'
  );
  PropertiesService.getScriptProperties().setProperty(
    'BEFORE_SPREADSHEET_ID',
    '1vfTIlu4Igs4V0xDmpUKuVYZ9X6g3nKDRwDbShnLE3DI'
  );
}

export function test_() {
  const targetPath = getTargetPath_();
  const beforeSheetName = `共有ドライブ移動前${targetPath}フォルダ`;
  execTestGetDataInformation_(root, beforeSheetName);
  const afterSheetName = cstMoveBeforeDataSheetName;
  testCompareDataBeforeAfterMove_(beforeSheetName, afterSheetName);
  SpreadsheetApp.getActiveSpreadsheet().rename(
    `共有ドライブに移動した${targetPath}フォルダの権限確認`
  );
}

export function execSetProperties_() {
  const targetFolderId = PropertiesService.getScriptProperties().getProperty(
    'TARGET_ROOT_FOLDER_ID'
  );
  if (!targetFolderId) {
    throw new Error('TARGET_ROOT_FOLDER_ID is not set in Script Properties.');
  }
  if (targetFolderId === 'FOLDER_ID_HERE') {
    throw new Error('Please set the actual folder ID in the code.');
  }
  setScriptProperties_(targetFolderId);
}
function execTestGetDataInformation_(root: string, outputSheetName: string) {
  const targetPath = getTargetPath_();
  const inputSheetName = cstMoveBeforeDataSheetName;
  const pathStartText = root === '' ? targetPath : `${root}/${targetPath}`;
  testGetDataInformation_(inputSheetName, outputSheetName, pathStartText);
}
function getTargetPath_() {
  const targetPath =
    PropertiesService.getScriptProperties().getProperty('TARGET_PATH');
  if (!targetPath) {
    throw new Error('TARGET_PATH is not set in Script Properties.');
  }
  return targetPath;
}
