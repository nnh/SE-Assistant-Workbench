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
 * スクリプトプロパティからスプレッドシートIDを取得し、スプレッドシートを返す関数
 * @param propertyKey スクリプトプロパティに保存されているスプレッドシートIDのキー
 * @returns Spreadsheet オブジェクト
 */
// スプレッドシートIDのプロパティキーをリテラルで定義
const SPREADSHEET_ID_PROPERTY_KEY = 'SPREADSHEET_ID';

function getSpreadsheetFromScriptProperty_(): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const scriptProperties = PropertiesService.getScriptProperties();
  const spreadsheetId = scriptProperties.getProperty(
    SPREADSHEET_ID_PROPERTY_KEY
  );
  if (!spreadsheetId) {
    throw new Error(
      `スクリプトプロパティ "${SPREADSHEET_ID_PROPERTY_KEY}" が見つかりません。`
    );
  }
  return SpreadsheetApp.openById(spreadsheetId);
}

export function main_() {
  const spreadsheet = getSpreadsheetFromScriptProperty_();
  const trialSheet = spreadsheet.getSheetByName('Trial');
  if (!trialSheet) {
    throw new Error('シート "Trial" が見つかりません。');
  }
  trialSheet
    .getRange('B47')
    .setFormula(
      '=IF(NOT(ISBLANK(B46)), (Quote!D30 - ROUNDUP(B46/(1+$B$45), 0)) / Quote!D30, 0)'
    );
  const quoteSheet = spreadsheet.getSheetByName('Quote');
  if (!quoteSheet) {
    throw new Error('シート "Quote" が見つかりません。');
  }
  quoteSheet.getRange('D33').setFormula('=ROUNDDOWN(D32*Trial!$B$45,0)');
}
/**
 * Trialシートの数式ロジックをテストする関数
 */
function test_TrialFormulaLogic() {
  const spreadsheet = getSpreadsheetFromScriptProperty_();
  const trialSheet = spreadsheet.getSheetByName('Trial');
  const quoteSheet = spreadsheet.getSheetByName('Quote');

  if (!trialSheet || !quoteSheet) {
    throw new Error('TrialまたはQuoteシートが見つかりません。');
  }
  // TrialシートのB45は消費税率、B46は特別値引後金額、B47は値引率の数式
  // Quoteシートの消費税セルはD33, 小計セルはD30

  const backup = {
    trialB45: trialSheet.getRange('B45').getValue(),
    trialB46: trialSheet.getRange('B46').getValue(),
    quoteD30Formula: quoteSheet.getRange('D30').getFormula(),
    trialB47Formula: trialSheet.getRange('B47').getFormula(),
  };

  try {
    console.log('--- テスト開始 ---');

    const testCases = [
      // --- 小数点第一位が「4」になるケース (0.4 <= 値引率 < 0.5) ---

      {
        label: 'ケース1：小数点第一位が4（45.0%）B46が割り切れる',
        b45: 0.1,
        b46: 1100000, // 税抜相当: 1,000,000 (ROUNDUP(1100000/1.1))
        d30: 1818182, // (1818182 - 1000000) / 1818182 ≒ 0.4500003
        expectedD31: -818182, // d30 * -値引率
        expectedD32: 1000000, // d30 + d31
        expectedD33: 100000, // TRUNC(1000000 * 0.1)
      },
      {
        label: 'ケース2：小数点第一位が4（45.4%）B46が割り切れない',
        b45: 0.1,
        b46: 1500001, // 税抜相当: 1,363,638 (ROUNDUP(1500001/1.1 = 1363637.27...))
        d30: 2500000, // (2500000 - 1363638) / 2500000 = 0.4545448
        expectedD31: -1136362,
        expectedD32: 1363638,
        expectedD33: 136363, // TRUNC(136363.8)
      },

      // --- 小数点第一位が「5」になるケース (0.5 <= 値引率 < 0.6) ---

      {
        label: 'ケース3：小数点第一位が5（50.0%）B46が割り切れる',
        b45: 0.1,
        b46: 1100000, // 税抜相当: 1,000,000
        d30: 2000000, // (2000000 - 1000000) / 2000000 = 0.5
        expectedD31: -1000000,
        expectedD32: 1000000,
        expectedD33: 100000,
      },
      {
        label: 'ケース4：小数点第一位が5（54.5%）B46が割り切れない',
        b45: 0.1,
        b46: 1000001, // 税抜相当: 909,092 (ROUNDUP(1000001/1.1 = 909091.8...))
        d30: 2000000, // (2000000 - 909092) / 2000000 = 0.545454
        expectedD31: -1090908,
        expectedD32: 909092,
        expectedD33: 90909, // TRUNC(90909.2)
      },

      // --- 関数挙動・境界値テスト ---

      {
        label: 'ケース5：値引率がちょうど59.9...%になるケース',
        b45: 0.1,
        b46: 1000000, // 税抜相当: 909,091 (ROUNDUP(1000000/1.1 = 909090.9...))
        d30: 2267060, // (2267060 - 909091) / 2267060 ≒ 0.59900...
        expectedD31: -1357969,
        expectedD32: 909091,
        expectedD33: 90909, // TRUNC(90909.1)
      },
    ];
    testCases.forEach((tc, index) => {
      // テスト値をセット
      trialSheet.getRange('B45').setValue(tc.b45);
      trialSheet.getRange('B46').setValue(tc.b46);
      quoteSheet.getRange('D30').setValue(tc.d30);

      // スプレッドシートの計算完了を待つために再計算を強制（念のため）
      SpreadsheetApp.flush();

      // 結果の取得
      const actualD31 = quoteSheet.getRange('D31').getValue();
      const actualD33 = quoteSheet.getRange('D33').getValue();
      const actualD34 = quoteSheet.getRange('D34').getValue();

      if (
        actualD31 === tc.expectedD31 &&
        actualD33 === tc.expectedD33 &&
        actualD34 === tc.b46
      ) {
        console.log(
          `✅ Test ${index + 1} [${tc.label}]: 成功 (結果: D31=${actualD31}, D33=${actualD33}, D34=${tc.b46})`
        );
      } else {
        throw new Error(
          `❌ Test ${index + 1} [${tc.label}]: 失敗 (期待値: D31=${tc.expectedD31}, D33=${tc.expectedD33}, D34=${tc.b46}, 実際: D31=${actualD31}, D33=${actualD33}, D34=${actualD34})`
        );
      }
    });
  } catch (e) {
    if (e instanceof Error) {
      console.error('テスト中にエラーが発生しました: ' + e.message);
    } else {
      console.error('テスト中にエラーが発生しました: ' + String(e));
    }
  } finally {
    // --- 4. 値を元に戻す (復元) ---
    console.log('--- データの復元中 ---');
    trialSheet.getRange('B45').setValue(backup.trialB45);
    trialSheet.getRange('B46').setValue(backup.trialB46);
    quoteSheet.getRange('D30').setFormula(backup.quoteD30Formula);
    trialSheet.getRange('B47').setFormula(backup.trialB47Formula);
    console.log('--- テスト終了（復元完了） ---');
  }
}
