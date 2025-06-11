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
/*import {
  coefficientSheetNameMap,
  getSpreadsheetByProperty_,
  compareValues_,
} from './common';*/
import { variable3_2015_10, variable3_2015_15 } from './forTest_variables';
class checkTemplateFormulas {
  inputSpreadsheetIdProperty: string;
  year: string;

  constructor(inputSpreadsheetIdProperty: string, year: string) {
    this.inputSpreadsheetIdProperty = inputSpreadsheetIdProperty;
    this.year = year;
  }
  getTargetSheet_(
    spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet,
    sheetName: string
  ): GoogleAppsScript.Spreadsheet.Sheet {
    const target = spreadSheet.getSheetByName(sheetName);
    if (!target) {
      throw new Error(`${sheetName}シートが見つかりません。`);
    }
    return target;
  }
  getTargetSheets_(
    spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet
  ): GoogleAppsScript.Spreadsheet.Sheet[] {
    const targets = ['Trial', 'Items'].map(sheetName =>
      this.getTargetSheet_(spreadSheet, sheetName)
    );
    if (targets.some(sheet => !sheet)) {
      throw new Error('必要なシートが見つかりません。');
    }
    return targets;
  }

  getSpreadsheetByProperty_(
    propertyKey: string
  ): GoogleAppsScript.Spreadsheet.Spreadsheet {
    const scriptProperties = PropertiesService.getScriptProperties();
    let spreadsheetId = scriptProperties.getProperty(propertyKey);
    if (!spreadsheetId) {
      this.copySpreadsheetAndSaveIdToProperties_(propertyKey);
      spreadsheetId = scriptProperties.getProperty(propertyKey)!;
    }
    const spreadsheet = SpreadsheetApp.openById(spreadsheetId);
    if (!spreadsheet) {
      throw new Error(
        `スプレッドシートID「${spreadsheetId}」のスプレッドシートが見つかりません。`
      );
    }
    return spreadsheet;
  }

  copySpreadsheetAndSaveIdToProperties_(propertyKey: string): void {
    const scriptProperties = PropertiesService.getScriptProperties();
    if (scriptProperties.getProperty(propertyKey)) {
      return;
    }
    // スクリプトプロパティから元のスプレッドシートIDを取得
    const originalSpreadsheetId = scriptProperties.getProperty(
      this.inputSpreadsheetIdProperty
    );
    if (!originalSpreadsheetId) {
      throw new Error(
        `スクリプトプロパティ「${this.inputSpreadsheetIdProperty}」が設定されていません。`
      );
    }

    // 元のスプレッドシートファイルを取得
    const originalFile = DriveApp.getFileById(originalSpreadsheetId);
    const originalFileName = originalFile.getName();

    // 実行日時を取得（例: 20240611_153045）
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const formattedDate = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    // ファイル名に実行日時を付加してコピー
    const copiedFile = originalFile.makeCopy(
      `${originalFileName}_${formattedDate}`
    );
    copiedFile.setName(`${originalFileName}_${formattedDate}`);

    // コピーしたファイルのIDをスクリプトプロパティに保存
    scriptProperties.setProperty(propertyKey, copiedFile.getId());
  }
}
export class checkTemplateFormulas2015 extends checkTemplateFormulas {
  constructor() {
    super('INPUT_SPREADSHEET_2015', '2015');
  }

  execCheckTemplateVariables(): void {
    const propertyKey = 'FOR_CHECK_FORMULAS_2015';
    const spreadSheet: GoogleAppsScript.Spreadsheet.Spreadsheet =
      this.getSpreadsheetByProperty_(propertyKey);
    const [trialSheet, itemsSheet]: GoogleAppsScript.Spreadsheet.Sheet[] =
      this.getTargetSheets_(spreadSheet);
    const testVariables = [variable3_2015_10, variable3_2015_15];
    testVariables.forEach((testVariable, testIndex) => {
      if (testIndex === 0) {
        trialSheet.getRange('B44').setValue(1);
      } else {
        trialSheet.getRange('B44').setValue(1.5);
      }
      testVariable.forEach(([caseId, crf, var1, var2, trialType], rowIndex) => {
        if (rowIndex === 0) {
          // ヘッダー行はそのまま出力
          return;
        }
        trialSheet.getRange('B28').setValue(caseId);
        trialSheet.getRange('B30').setValue(crf);
        trialSheet.getRange('B27').setValue(trialType);
        SpreadsheetApp.flush(); // 変更を反映
        const var1Value = itemsSheet.getRange('C43').getValue();
        const var2Value = itemsSheet.getRange('C44').getValue();
        const expectedVar1Num = Number(String(var1).replace(/,/g, ''));
        const expectedVar2Num = Number(String(var2).replace(/,/g, ''));

        if (var1Value !== expectedVar1Num) {
          throw new Error(
            `変数1の値が一致しません: (caseId: ${caseId}, crf: ${crf}, trialType: ${trialType}) の変数1: ${var1Value}, 期待値: ${var1}`
          );
        }
        if (var2Value !== expectedVar2Num) {
          throw new Error(
            `変数2の値が一致しません: (caseId: ${caseId}, crf: ${crf}, trialType: ${trialType}) の変数2: ${var2Value}, 期待値: ${var2}`
          );
        }
      });
      console.log(
        `変数チェックが完了しました: ${testIndex === 0 ? '係数1' : '係数1.5'}`
      );
    });
  }
}
