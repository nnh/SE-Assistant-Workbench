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
 * Lists the calendars shown in the user's calendar list.
 * @see https://developers.google.com/calendar/api/v3/reference/calendarList/list
 */
import { RESOURCE_CALENDAR_SUFFIX } from './const';
export function listCalendars_() {
  let calendars;
  let pageToken;
  let result: Array<[string, string]> = [];
  do {
    const calendarClass: GoogleAppsScript.Calendar | undefined = Calendar;
    if (!calendarClass) {
      throw new Error('Calendar service is not available.');
    }
    calendars = calendarClass.CalendarList.list({
      maxResults: 100,
      pageToken: pageToken,
    });
    if (!calendars.items || calendars.items.length === 0) {
      console.log('No calendars found.');
      return;
    }
    // Print the calendar id and calendar summary
    for (const calendar of calendars.items) {
      const summary = calendar.summary || 'No Title';
      const id = calendar.id || 'No ID';
      result.push([summary, id]);
    }
    pageToken = calendars.nextPageToken;
  } while (pageToken);
  return result;
}

export function getCalendars_(id: string): string[][] {
  // Avoid rate limits by sleeping for 2000ms before fetching events
  Utilities.sleep(2000);
  const calendar = CalendarApp.getCalendarById(id);
  if (!calendar) {
    throw new Error(`Calendar with ID ${id} not found.`);
  }
  const today = new Date();
  // 会議室の場合は2027年3月31日まで取得する
  let events: GoogleAppsScript.Calendar.CalendarEvent[];
  if (id.endsWith(RESOURCE_CALENDAR_SUFFIX)) {
    events = calendar.getEvents(today, new Date('2027-03-31'));
  } else {
    events = calendar.getEvents(today, new Date('2026-03-31'));
  }
  if (events.length === 0) {
    console.log('No upcoming events found.');
    return [[id, 'No Events', '', '', '', '', '', '']];
  }
  const eventsInfo: string[][] = events
    .map(event => {
      // 会議室の場合はゲストなしでも出力する
      if (id.endsWith(RESOURCE_CALENDAR_SUFFIX)) {
        // 会議室の場合はゲストなしでも出力するため、ここでnullを返さない
      } else {
        if (event.getGuestList(false).length === 0) {
          return null;
        }
      }
      const temp: string[] = event
        .getGuestList(false)
        .map(guest => guest.getEmail());
      const checkTarget = temp.filter(guest => guest !== id);
      if (checkTarget.length === 0 && !id.endsWith(RESOURCE_CALENDAR_SUFFIX)) {
        return null;
      }
      const guestList = temp.map(guest => guest).join(', ');
      const startTime = event.getStartTime();
      const endTime = event.getEndTime();
      const startDay = Utilities.formatDate(
        startTime,
        Session.getScriptTimeZone(),
        'yyyy/MM/dd'
      );
      const startTimeStr = Utilities.formatDate(
        startTime,
        Session.getScriptTimeZone(),
        'HH:mm'
      );
      const endTimeStr = Utilities.formatDate(
        endTime,
        Session.getScriptTimeZone(),
        'HH:mm'
      );
      const endDay = Utilities.formatDate(
        endTime,
        Session.getScriptTimeZone(),
        'yyyy/MM/dd'
      );
      return [
        id,
        event.getId(),
        event.getTitle(),
        startDay,
        startTimeStr,
        endDay,
        endTimeStr,
        guestList,
      ];
    })
    .filter(info => info !== null) as string[][];
  return eventsInfo;
}
