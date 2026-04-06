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
 * スクリプトプロパティの型定義
 */
interface AppConfig {
  idA: string;
  nameA: string;
  idB: string;
  nameB: string;
  rootA: string; // 追加
  rootB: string; // 追加
  lastCol: number;
  idColIdx: number;
}

/**
 * メインの比較処理
 */
export function executeCompare_(): void {
  const props = PropertiesService.getScriptProperties().getProperties();

  const config: AppConfig = {
    idA: props['SS_ID_A'] || '',
    nameA: props['SHEET_NAME_A'] || '',
    idB: props['SS_ID_B'] || '',
    nameB: props['SHEET_NAME_B'] || '',
    rootA: props['ROOT_A'] || '', // 追加
    rootB: props['ROOT_B'] || '', // 追加
    lastCol: 11, // K列まで
    idColIdx: 3, // D列 (0-indexed)
  };

  // バリデーション
  if (
    !config.idA ||
    !config.idB ||
    !config.nameA ||
    !config.nameB ||
    !config.rootA ||
    !config.rootB
  ) {
    throw new Error(
      'スクリプトプロパティ (SS_ID_A, SHEET_NAME_A, SS_ID_B, SHEET_NAME_B, ROOT_A, ROOT_B) を設定してください。'
    );
  }
  // データの取得
  const dataA = getSheetData_(config.idA, config.nameA, config.lastCol);
  const dataB = getSheetData_(config.idB, config.nameB, config.lastCol);

  // IDをキーにしたMapを作成
  const mapA = createDataMap_(dataA.values, config.idColIdx);
  const mapB = createDataMap_(dataB.values, config.idColIdx);

  // 全てのIDを抽出してソート
  const allIds: string[] = Array.from(
    new Set([...mapA.keys(), ...mapB.keys()])
  ).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const diffResult: string[][] = [];

  // 比較処理
  allIds.forEach(id => {
    const rowA = mapA.get(id);
    const rowB = mapB.get(id);

    if (!rowA && rowB) {
      diffResult.push(['シートBにのみ存在', id, '新規追加', ...rowB]);
    } else if (rowA && !rowB) {
      diffResult.push(['シートAにのみ存在', id, '削除済み', ...rowA]);
    } else if (rowA && rowB) {
      // --- パスを置換して比較用のデータを作成 ---
      const normalizedA = normalizePaths_(rowA, config.rootA);
      const normalizedB = normalizePaths_(rowB, config.rootB);

      // 置換後のデータで比較
      if (JSON.stringify(normalizedA) !== JSON.stringify(normalizedB)) {
        diffResult.push(['値の不一致', id, '比較元(A)', ...rowA]);
        diffResult.push(['', '', '比較先(B)', ...rowB]);
      }
    }
  });

  outputToResultSheet_(diffResult, dataA.header, config);
}

/**
 * 行データ内の特定のルートパスを削除（空文字に置換）して正規化する
 */
function normalizePaths_(row: string[], rootPath: string): string[] {
  if (!rootPath) return row; // 置換設定がなければそのまま

  return row.map(cell => {
    if (typeof cell === 'string' && cell.includes(rootPath)) {
      // ルートパス部分を削除して共通の形にする
      return cell.replace(rootPath, '');
    }
    return cell;
  });
}

/**
 * シートからデータを取得する
 */
function getSheetData_(
  ssId: string,
  sheetName: string,
  lastCol: number
): { header: string[]; values: string[][] } {
  const ss = SpreadsheetApp.openById(ssId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error(`シートが見つかりません: ${sheetName}`);

  const lastRow = sheet.getLastRow();
  const header = sheet.getRange(1, 1, 1, lastCol).getValues()[0] as string[];
  const values =
    lastRow > 1
      ? (sheet.getRange(2, 1, lastRow - 1, lastCol).getValues() as string[][])
      : [];

  return { header, values };
}

/**
 * ID列をキーにしたMapを作成
 */
function createDataMap_(
  values: string[][],
  idColIdx: number
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  values.forEach(row => {
    const id = String(row[idColIdx]);
    if (id) map.set(id, row);
  });
  return map;
}

/**
 * 結果をアクティブなスプレッドシートに出力
 */
function outputToResultSheet_(
  result: string[][],
  header: string[],
  config: AppConfig
): void {
  const activeSs = SpreadsheetApp.getActiveSpreadsheet();
  let resultSheet = activeSs.getSheetByName('Diff_Result');

  if (!resultSheet) {
    resultSheet = activeSs.insertSheet('Diff_Result');
  }
  resultSheet.clear();

  const info = [
    ['比較実行日', new Date()],
    ['比較元(A) ID', config.idA],
    ['比較元(A) シート', config.nameA],
    ['比較元(A) ルート', config.rootA],
    ['比較先(B) ID', config.idB],
    ['比較先(B) シート', config.nameB],
    ['比較先(B) ルート', config.rootB],
    ['', ''],
  ];
  resultSheet.getRange(1, 1, info.length, 2).setValues(info);

  if (result.length > 0) {
    const tableHeader = ['区分', 'ID(Key)', 'データソース', ...header];
    resultSheet
      .getRange(info.length + 1, 1, 1, tableHeader.length)
      .setValues([tableHeader])
      .setBackground('#444444')
      .setFontColor('#ffffff')
      .setFontWeight('bold');

    resultSheet
      .getRange(info.length + 2, 1, result.length, result[0].length)
      .setValues(result);

    resultSheet
      .getRange(info.length + 1, 1, result.length + 1, tableHeader.length)
      .setBorder(true, true, true, true, true, true);
  } else {
    resultSheet
      .getRange(info.length + 1, 1)
      .setValue('差分は見つかりませんでした。');
  }

  resultSheet.activate();
  console.log('比較処理が完了しました。');
}
