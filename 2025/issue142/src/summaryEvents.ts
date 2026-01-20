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
import { getOrCreateSheet_, getSheetOrNull_ } from './spreadsheetUtils';
import { EVENT_SUMMARY_SHEET_NAME, EVENT_OUTPUT_SHEET_NAME } from './const';

export function summaryEvents_() {
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet | null = getSheetOrNull_(
    EVENT_OUTPUT_SHEET_NAME
  );
  if (!inputSheet) {
    throw new Error(`Sheet "${EVENT_OUTPUT_SHEET_NAME}" not found.`);
  }
  const idxes = new Map<string, number>();
  idxes.set('id', 0);
  idxes.set('eventId', 1);
  idxes.set('title', 2);
  idxes.set('startDay', 3);
  idxes.set('startTime', 4);
  idxes.set('endDay', 5);
  idxes.set('endTime', 6);
  idxes.set('guests', 7);
  const dataRange = inputSheet.getDataRange();
  const dataValues = dataRange
    .getValues()
    .filter(row => row[idxes.get('eventId')!] !== 'No Events')
    .filter(row => row[idxes.get('title')!] !== '解析プログラマー打ち合わせ')
    .filter(row => row[idxes.get('title')!] !== 'VSCODEでのSAS実行について')
    .filter(row => row[idxes.get('title')!] !== 'SE meeting')
    .filter((row, idx) => {
      if (idx === 0) return true; // ヘッダー行は常に残す
      const startDay = row[idxes.get('startDay')!];
      if (!startDay) return false;
      // 日付が "YYYY/MM/DD" 形式であることを前提
      const date = new Date(startDay);
      const limit = new Date('2026/03/31');
      const lowerLimit = new Date('2026/02/01');
      if (date < lowerLimit) return false;
      return date <= limit;
    }) as string[][];
  const uniqueDataValues = dataValues.filter((row, i, arr) => {
    if (
      !row[idxes.get('id')!].endsWith('@nnh.go.jp') &&
      !row[idxes.get('id')!].endsWith('@nagoya.hosp.go.jp')
    ) {
      return true; // 会議室は重複チェックをスキップ
    }
    if (i === 0) return true; // ヘッダー行は常に残す
    const key = [
      row[idxes.get('eventId')!],
      row[idxes.get('startDay')!],
      row[idxes.get('startTime')!],
      row[idxes.get('endDay')!],
      row[idxes.get('endTime')!],
    ].join('|');
    return (
      arr.findIndex((r, j) => {
        if (j === 0) return false; // ヘッダー行はスキップ
        return (
          [
            r[idxes.get('eventId')!],
            r[idxes.get('startDay')!],
            r[idxes.get('startTime')!],
            r[idxes.get('endDay')!],
            r[idxes.get('endTime')!],
          ].join('|') === key
        );
      }) === i
    );
  });
  const sortValues = uniqueDataValues.slice(1).sort((a, b) => {
    const dayA = toDate_(a[idxes.get('startDay')!]);
    const timeA = toDate_(a[idxes.get('startTime')!]);

    const dayB = toDate_(b[idxes.get('startDay')!]);
    const timeB = toDate_(b[idxes.get('startTime')!]);
    const dateA = new Date(dayA);
    dateA.setHours(timeA.getHours(), timeA.getMinutes(), timeA.getSeconds(), 0);

    const dateB = new Date(dayB);
    dateB.setHours(timeB.getHours(), timeB.getMinutes(), timeB.getSeconds(), 0);

    return dateA.getTime() - dateB.getTime();
  });
  const outputBody = sortValues.map(row => {
    if (
      !row[idxes.get('id')!].endsWith('@nnh.go.jp') &&
      !row[idxes.get('id')!].endsWith('@nagoya.hosp.go.jp')
    ) {
      const guestList = row[idxes.get('guests')!].split(', ').join('\n');
      row[idxes.get('guests')!] = guestList;
      return row;
    }
    const guestList = row[idxes.get('guests')!].split(', ');
    if (!guestList.includes(row[idxes.get('id')!])) {
      guestList.push(row[idxes.get('id')!]);
    }
    row[idxes.get('guests')!] = guestList.join('\n');
    row[idxes.get('id')!] = '';
    return row;
  });

  const outputValues = [uniqueDataValues[0], ...outputBody];
  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet = getOrCreateSheet_(
    EVENT_SUMMARY_SHEET_NAME
  );
  outputSheet
    .getRange(1, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
  outputSheet.getRange(1, 1).setValue('会議室以外は空白にしています');
}
function toDate_(v: unknown): Date {
  if (v instanceof Date) {
    return v;
  }

  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!isNaN(d.getTime())) {
      return d;
    }
  }

  throw new Error(`Invalid date value: ${v}`);
}
