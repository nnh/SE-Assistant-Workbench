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
/* eslint-disable @typescript-eslint/no-unused-vars */
import { hello } from './example-module';
import { listCalendars_, getCalendars_ } from './getCalendar';
import { getOrCreateSheet_, getSheetOrNull_ } from './spreadsheetUtils';
import {
  TARGET_CALENDAR_IDS_SHEET_NAME,
  RESOURCE_CALENDAR_SUFFIX,
} from './const';

function listEvents() {
  const targetCalendarIdsSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    getSheetOrNull_(TARGET_CALENDAR_IDS_SHEET_NAME);
  if (!targetCalendarIdsSheet) {
    throw new Error(`Sheet "${TARGET_CALENDAR_IDS_SHEET_NAME}" not found.`);
  }
  const targetCalendars: string[][] = targetCalendarIdsSheet
    .getDataRange()
    .getValues();
  // 会議室の情報を取得
  const meetingRooms = targetCalendars.filter(
    row =>
      typeof row[1] === 'string' && row[1].endsWith(RESOURCE_CALENDAR_SUFFIX)
  );
  // 除外対象のカレンダーIDを正規表現でリスト化
  const excluedTarget = targetCalendars.filter(row => row[2] === '除外');
  const excluedTargetIds: RegExp[] = [];
  if (excluedTarget.length > 0) {
    for (let i = 0; i < excluedTarget.length; i++) {
      excluedTargetIds.push(new RegExp(excluedTarget[i][1] as string));
    }
  }
  const excluedConstIds: RegExp[] = [
    new RegExp('ja.japanese#holiday@group.v.calendar.google.com'),
    new RegExp('test.for.shareddrive@nnh.go.jp'),
  ];
  const excluedIds: RegExp[] = [...excluedTargetIds, ...excluedConstIds];
  const targetCalendarIdList: string[] = targetCalendars
    .slice(1) // 1行目（ヘッダー）を除外
    .map(row => row[1] as string)
    .filter(id => !excluedIds.some(regex => regex.test(id)));
  if (targetCalendarIdList.length === 0) {
    console.log('No target calendar IDs found.');
    return;
  }
  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    getSheetOrNull_('イベント一覧');
  if (!outputSheet) {
    throw new Error('Sheet "イベント一覧" not found.');
  }
  let outputRowNumber = outputSheet.getLastRow() + 1;
  // 対象のカレンダーIDを配列で指定します
  const targetCalendarIds = targetCalendarIdList;
  const header = [
    'id',
    'eventId',
    'title',
    'startDay',
    'startTime',
    'endDay',
    'endTime',
    'guests',
  ];
  outputSheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (outputRowNumber === 1) {
    outputRowNumber++;
  }
  for (let i = 0; i < targetCalendarIds.length; i++) {
    const eventsArray: string[][] = getCalendars_(targetCalendarIds[i]);
    if (eventsArray.length === 0) {
      continue;
    }
    let outputValues: string[][];
    if (eventsArray[0][0].endsWith(RESOURCE_CALENDAR_SUFFIX)) {
      // 会議室の場合、meetingRooms配列から名前を取得してセット
      const roomName = meetingRooms.find(
        row => row[1] === eventsArray[0][0]
      )?.[0];
      outputValues = eventsArray.map(event => {
        const newEvent = [...event];
        newEvent[0] = roomName || '不明な会議室';
        return newEvent;
      });
    } else {
      outputValues = eventsArray;
    }
    outputSheet
      .getRange(outputRowNumber, 1, outputValues.length, header.length)
      .setValues(outputValues);
    outputRowNumber += outputValues.length;
    console.log(`Finished processing calendar ID: ${targetCalendarIds[i]}`);
  }
}

function listCalendars() {
  // 実行ユーザのマイカレンダー配下のカレンダー一覧を取得してスプレッドシートに出力します
  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet = getOrCreateSheet_(
    TARGET_CALENDAR_IDS_SHEET_NAME
  );
  const calendars = listCalendars_();
  if (!calendars) {
    outputSheet.getRange(1, 1).setValue('カレンダーが見つかりませんでした。');
    return;
  }
  // ヘッダー行の設定
  outputSheet.getRange(1, 1).setValue('名前');
  outputSheet.getRange(1, 2).setValue('ID');
  outputSheet.getRange(1, 3).setValue('処理対象外にする場合は"除外"と記載');
  // カレンダー情報の出力
  outputSheet.getRange(2, 1, calendars.length, 2).setValues(calendars);
}

// Example usage
console.log(hello());
