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
/**
 * スプレッドシートの権限情報をチェックし、M列に判定結果を出力する。
 */
export function checkSheetPermissions_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('外部共有フォルダ・ファイル一覧');
  if (!sheet) {
    throw new Error(
      '「外部共有フォルダ・ファイル一覧」シートが見つかりません。'
    );
  }
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  // A列(1)からK列(11)までのデータを取得
  const range = sheet.getRange(2, 1, lastRow - 1, 11);
  const data = range.getValues();

  // フォルダ情報と、パスごとの統計を保持するマップ
  const folderMap: { [path: string]: any } = {};
  const pathStats: {
    [path: string]: {
      totalFiles: number;
      sameAsFolderCount: number;
      hasWebPublished: boolean;
    };
  } = {};

  // --- ステップ1: 各パスの状況（統計）を把握する ---
  data.forEach(row => {
    const type = row[0]; // A列: 種別
    const path = row[1]; // B列: パス
    const webStatus = row[10]; // K列: Web公開情報

    // 統計オブジェクトの初期化
    if (!pathStats[path]) {
      pathStats[path] = {
        totalFiles: 0,
        sameAsFolderCount: 0,
        hasWebPublished: false,
      };
    }

    // Web公開が1つでもあるかチェック
    if (webStatus === '公開') {
      pathStats[path].hasWebPublished = true;
    }

    if (type === 'フォルダ') {
      folderMap[path] = {
        access: row[5], // F列: アクセス種別
        permission: row[6], // G列: 権限
        editors: row[8], // I列: 編集者
        viewers: row[9], // J列: 閲覧者
      };
    }
  });

  // --- ステップ2: 各ファイルがフォルダと一致しているかカウントする ---
  data.forEach(row => {
    const type = row[0];
    const path = row[1];
    if (type === 'ファイル') {
      pathStats[path].totalFiles++;
      const fInfo = folderMap[path];
      if (fInfo) {
        const isSame =
          row[5] === fInfo.access &&
          row[6] === fInfo.permission &&
          row[8] === fInfo.editors &&
          row[9] === fInfo.viewers;

        if (isSame) {
          pathStats[path].sameAsFolderCount++;
        }
      }
    }
  });

  // --- ステップ3: 判定結果の作成 ---
  const results: string[][] = [];
  results.push(['判定結果']); // 1行目（ヘッダー用）

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const type = row[0];
    const path = row[1];
    const stats = pathStats[path];

    let message = '';

    if (type === 'フォルダ') {
      message = 'フォルダ';
    } else if (type === 'ファイル') {
      // 条件1: フォルダ内に1つでもWeb公開アイテムがある場合は何も出力しない
      if (stats.hasWebPublished) {
        message = '';
      }
      // 条件2: フォルダ内のすべてのファイルの権限がフォルダと同じ場合
      // (ファイルが存在し、かつ一致数が総数と同じ)
      else if (
        stats.totalFiles > 0 &&
        stats.totalFiles === stats.sameAsFolderCount
      ) {
        message = 'フォルダ内のすべてのファイルの権限がフォルダと同じ';
      }
    }

    results.push([message]);
  }

  // M列（13列目）に結果を一括で書き込み
  sheet.getRange(1, 13, results.length, 1).setValues(results);

  console.log('完了しました');
}

/**
 * 指定フォルダ内の全スプレッドシートから「外部共有フォルダ・ファイル」シートのデータを集約する
 */
export function aggregateExternalShareData_() {
  const props = PropertiesService.getScriptProperties();
  const folderId = props.getProperty('FOLDER_ID');

  if (!folderId) {
    throw new Error('スクリプトプロパティ "FOLDER_ID" が設定されていません。');
  }

  const targetFolderName = '外部共有フォルダ・ファイル'; // 対象のシート名
  const activeSheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByType(MimeType.GOOGLE_SHEETS);

  let allData: string[][] = [];
  let isFirstFile = true;

  while (files.hasNext()) {
    const file = files.next();
    const ss = SpreadsheetApp.open(file);
    const sheet = ss.getSheetByName(targetFolderName);

    // 指定したシート名が存在しない場合はスキップ
    if (!sheet) {
      console.warn(
        `ファイル「${file.getName()}」に「${targetFolderName}」シートが見つかりませんでした。`
      );
      continue;
    }

    const data = sheet.getDataRange().getValues();

    if (data.length > 0) {
      if (isFirstFile) {
        // 最初のファイルは全データ（見出し含む）を追加
        allData = allData.concat(data);
        isFirstFile = false;
      } else {
        // 2回目以降は1行目（見出し）を除いたデータのみを追加
        if (data.length > 1) {
          allData = allData.concat(data.slice(1));
        }
      }
    }
  }

  // アクティブシートをクリアして結果を出力
  if (allData.length > 0) {
    activeSheet.clearContents();
    activeSheet
      .getRange(1, 1, allData.length, allData[0].length)
      .setValues(allData);
    SpreadsheetApp.getUi().alert('データの集約が完了しました。');
  } else {
    SpreadsheetApp.getUi().alert('対象のデータが見つかりませんでした。');
  }
}
/**
 * rawdataシートから条件に合致する行を除外して、
 * 「2_不要なフォルダ出力を削除」シートに出力する
 */
export function filterAndExportRawData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheet = ss.getSheetByName('1_rawdata');
  const targetSheet = ss.getSheetByName('2_不要なフォルダ出力を削除');

  // シートの存在確認
  if (!sourceSheet) {
    throw new Error('「1_rawdata」シートが見つかりません。');
  }
  if (!targetSheet) {
    throw new Error('「2_不要なフォルダ出力を削除」シートが見つかりません。');
  }

  // 元データを取得
  const values = sourceSheet.getDataRange().getValues();
  if (values.length === 0) return;

  const header = values[0]; // 見出し行
  const data = values.slice(1); // データ行

  // フィルタリング処理
  const filteredData = data.filter(row => {
    // インデックスは0から始まるため A=0, F=5, I=8, J=9
    const colA = row[0];
    const colF = row[5];
    const colI = row[8];
    const colJ = row[9];

    // 除外条件: A=フォルダ AND F=PRIVATE AND I=空 AND J=空
    const isExclude =
      colA === 'フォルダ' &&
      colF === 'PRIVATE' &&
      String(colI).trim() === '' &&
      String(colJ).trim() === '';

    // 除外条件に合致しない（false）ものを残す
    return !isExclude;
  });

  // 出力先をクリアして書き込み
  targetSheet.clearContents();

  // 見出しとフィルタ後のデータを結合して一括書き込み
  const outputValues = [header, ...filteredData];
  targetSheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);

  SpreadsheetApp.getUi().alert('抽出処理が完了しました。');
}
/**
 * 「2_不要なフォルダ出力を削除」シートのデータを加工して
 * 「外部共有フォルダ・ファイル一覧」シートに出力する
 * シートがない場合は新規作成、ある場合はクリアする
 */
export function editAndExportFinalData_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sourceSheetName = '2_不要なフォルダ出力を削除';
  const targetSheetName = '外部共有フォルダ・ファイル一覧';

  const sourceSheet = ss.getSheetByName(sourceSheetName);
  if (!sourceSheet) {
    throw new Error(`元となる「${sourceSheetName}」シートが見つかりません。`);
  }

  // targetSheetの存在確認と取得・作成
  let targetSheet = ss.getSheetByName(targetSheetName);
  if (!targetSheet) {
    // 存在しない場合は新規作成（一番最後のタブに追加）
    targetSheet = ss.insertSheet(targetSheetName, ss.getNumSheets());
  } else {
    // 存在する場合は内容（値と書式）をすべてクリア
    targetSheet.clear();
  }

  const values = sourceSheet.getDataRange().getValues();
  if (values.length === 0) return;

  const header = values[0];
  const data: string[][] = values.slice(1);

  // 編集処理
  const editedData = data.map(row => {
    // 1. B列(index 1): 先頭の「ドライブ/」を削除
    if (typeof row[1] === 'string') {
      row[1] = row[1].replace(/^ドライブ\//, '');
    }

    // 2. F列(index 5): 公開範囲の置換
    const fVal = row[5];
    if (fVal === 'ANYONE_WITH_LINK') {
      row[5] = 'リンクを知っている全員';
    } else if (fVal === 'PRIVATE') {
      row[5] = '制限付き';
    } else if (fVal === 'DOMAIN_WITH_LINK') {
      row[5] = '独立行政法人国立病院機構名古屋医療センター';
    }

    // 3. G列(index 6): 権限の置換
    const gVal = row[6];
    const gMap: { [key: string]: string | undefined } = {
      VIEW: '閲覧者',
      COMMENT: '閲覧者（コメント可）',
      EDIT: '編集者',
      FILE_ORGANIZER: 'コンテンツ管理者',
      NONE: '',
    };
    // gMap[gVal] の結果が undefined でなければそれを使い、なければ元の gVal を使う
    row[6] = gMap[gVal] ?? gVal;

    // 4. I列・J列(index 8, 9): 特定ドメインのメールアドレス削除
    row[8] = filterEmailAddresses_(row[8]);
    row[9] = filterEmailAddresses_(row[9]);

    // K列が「フォルダ」ならば「フォルダはWeb公開対象外」に置換する
    if (row[10] === 'フォルダ') {
      row[10] = 'フォルダはWeb公開対象外';
    }

    return row;
  });

  // 見出しとデータを結合
  const outputValues = [header, ...editedData];

  // データの書き込み
  targetSheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);

  // （オプション）見出し行を固定して少し見やすくする
  targetSheet.setFrozenRows(1);

  console.log('最終データの出力が完了しました。');
}

/**
 * セル内の改行区切りのメールアドレスから特定ドメインを除外する補助関数
 */
function filterEmailAddresses_(cellValue: string): string {
  if (!cellValue || typeof cellValue !== 'string') return cellValue;

  const addresses = cellValue.split(/\r?\n/);

  const filtered = addresses.filter(email => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return false;

    // @nnh.go.jp または @nagoya.hosp.go.jp を含むものを除外
    const isTargetDomain = /@(nnh\.go\.jp|nagoya\.hosp\.go\.jp)$/i.test(
      trimmedEmail
    );
    return !isTargetDomain;
  });

  return filtered.join('\n');
}
