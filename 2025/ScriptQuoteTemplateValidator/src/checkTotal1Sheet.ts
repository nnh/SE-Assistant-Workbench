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
import {
  getSheetBySheetName_,
  trialSheetName,
  coefficients15,
  observationalStudy,
  specificClinicalResearch,
  interventionalStudy,
  investigatorInitiatedClinicalTrial,
} from './commonForTest';
export function checkTotal1Sheet_(
  spreadsheet: GoogleAppsScript.Spreadsheet.Spreadsheet
): void {
  const totalSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    spreadsheet,
    'Total'
  );
  const trialSheet: GoogleAppsScript.Spreadsheet.Sheet = getSheetBySheetName_(
    spreadsheet,
    trialSheetName
  );
  const setupMonth: number =
    trialSheet.getRange('B27').getValue() === observationalStudy ? 3 : 6;
  const closingMonth: number =
    trialSheet.getRange('B27').getValue() === observationalStudy ? 3 : 6;
  const totalMonth: number = trialSheet.getRange('F40').getValue();
  const registrationMonth: number = totalMonth - setupMonth - closingMonth;
  const caseCount: number = trialSheet.getRange('B28').getValue();
  const facilityCount: number = trialSheet.getRange('B29').getValue();
  const investigatorInitiatedClinicalTrialFlag: boolean =
    trialSheet.getRange('B27').getValue() ===
    investigatorInitiatedClinicalTrial;
  const specificClinicalResearchFlag: boolean =
    trialSheet.getRange('B27').getValue() === specificClinicalResearch;
  const quotationRequestSheet: GoogleAppsScript.Spreadsheet.Sheet =
    getSheetBySheetName_(spreadsheet, 'Quotation Request');
  const caseConference: boolean =
    quotationRequestSheet.getRange('I2').getValue() === 'あり';
  const officeSupport: boolean =
    quotationRequestSheet.getRange('AQ2').getValue() === 'あり' ||
    quotationRequestSheet.getRange('AN2').getValue() === coefficients15 ||
    investigatorInitiatedClinicalTrialFlag;
  const monitoring =
    (quotationRequestSheet.getRange('O2').getValue() !== '' &&
      quotationRequestSheet.getRange('O2').getValue() > 0) ||
    (quotationRequestSheet.getRange('P2').getValue() !== '' &&
      quotationRequestSheet.getRange('P2').getValue() > 0);
  const crb: boolean =
    quotationRequestSheet.getRange('L2').getValue() === 'あり';
  const crbYears =
    crb && registrationMonth > 12 ? Math.ceil(registrationMonth / 12) : 0;
  const audit =
    quotationRequestSheet.getRange('Q2').getValue() !== '' &&
    quotationRequestSheet.getRange('Q2').getValue() > 0;
  const finalAnalysis: boolean =
    quotationRequestSheet.getRange('AP2').getValue() === 'あり';
  const inputFinalAnalysisTables = quotationRequestSheet
    .getRange('AF2')
    .getValue();
  const finalAnalysisTables: number = finalAnalysis
    ? investigatorInitiatedClinicalTrialFlag
      ? inputFinalAnalysisTables < 50
        ? 50
        : inputFinalAnalysisTables
      : inputFinalAnalysisTables
    : 0;
  const total1CheckMap = new Map<string, number>([
    ['F6', 1],
    ['F7', 4],
    ['F9', quotationRequestSheet.getRange('H2').getValue() === 'あり' ? 1 : 0],
    ['F11', quotationRequestSheet.getRange('U2').getValue() === 'あり' ? 1 : 0],
    ['F13', totalMonth],
    ['F15', officeSupport ? setupMonth : 0],
    [
      'F16',
      quotationRequestSheet.getRange('AB2').getValue() === 'あり' ? 1 : 0,
    ],
    ['F17', investigatorInitiatedClinicalTrialFlag && caseConference ? 1 : 0],
    ['F18', investigatorInitiatedClinicalTrialFlag ? 1 : 0],
    ['F19', investigatorInitiatedClinicalTrialFlag ? facilityCount : 0],
    ['F20', specificClinicalResearchFlag ? facilityCount : 0],
    ['F21', 0],
    ['F22', investigatorInitiatedClinicalTrialFlag ? facilityCount : 0],
    ['F23', officeSupport ? registrationMonth : 0],
    ['F24', officeSupport ? 1 : 0],
    ['F25', 0],
    ['F26', investigatorInitiatedClinicalTrialFlag ? 1 : 0],
    ['F28', monitoring ? 1 : 0],
    ['F29', 0],
    ['F31', 0],
    ['F32', 1],
    ['F33', totalMonth - setupMonth],
    ['F36', 1],
    ['F37', 0],
    ['F39', 1],
    ['F40', 1],
    ['F41', facilityCount],
    ['F42', 1],
    ['F44', registrationMonth],
    ['F45', 1],
    ['F47', 1],
    ['F48', investigatorInitiatedClinicalTrialFlag && caseConference ? 1 : 0],
    [
      'F50',
      quotationRequestSheet.getRange('S2').getValue() === '設置・委託する'
        ? registrationMonth
        : 0,
    ],
    [
      'F51',
      quotationRequestSheet.getRange('T2').getValue() === '設置・委託する'
        ? registrationMonth
        : 0,
    ],
    ['F53', finalAnalysis ? 1 : 0],
    ['F54', 0],
    ['F55', 0],
    ['F56', finalAnalysisTables],
    ['F57', finalAnalysis ? 1 : 0],
    [
      'F59',
      quotationRequestSheet.getRange('M2').getValue() === 'あり' ||
      investigatorInitiatedClinicalTrialFlag
        ? 1
        : 0,
    ],
    ['F61', 0],
    ['F62', 0],
    ['F63', 0],
    [
      'F65',
      quotationRequestSheet.getRange('AI2').getValue() === 'あり'
        ? facilityCount
        : 0,
    ],
    [
      'F66',
      quotationRequestSheet.getRange('AJ2').getValue() === 'あり'
        ? caseCount
        : 0,
    ],
    [
      'F67',
      quotationRequestSheet.getRange('AK2').getValue() === 'あり'
        ? caseCount
        : 0,
    ],
    ['F69', 0],
    ['F70', 0],
    ['F71', 0],
    [
      'F79',
      quotationRequestSheet.getRange('R2').getValue() !== '' &&
      quotationRequestSheet.getRange('R2').getValue() > 0
        ? 1
        : 0,
    ],
    ['F73', crb ? 1 : 0],
    ['F74', crbYears],
    ['F76', audit ? 2 : 0],
    ['F77', audit ? quotationRequestSheet.getRange('Q2').getValue() : 0],
    ['F81', 0],
    [
      'F82',
      quotationRequestSheet.getRange('K2').getValue() === 'あり'
        ? facilityCount
        : 0,
    ],
    ['F83', quotationRequestSheet.getRange('J2').getValue() === 'あり' ? 1 : 0],
    ['F84', 0],
    ['F85', 0],
    ['F86', 0],
    ['F87', 0],
    ['F88', 0],
    ['F89', 0],
    ['F90', 0],
    ['F91', 0],
    ['F92', 0],
    ['F93', 0],
    ['F94', 0],
  ]);

  total1CheckMap.forEach((expectedValue, cell) => {
    const actualValue = totalSheet.getRange(cell).getValue();
    if (actualValue !== expectedValue) {
      throw new Error(
        `Total1シート!${cell}の値が不正です。期待値: ${expectedValue}, 実際の値: ${actualValue}`
      );
    }
  });
  console.log('Total1シートのチェックが完了しました。');
}
