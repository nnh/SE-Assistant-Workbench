function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('主催者のカレンダー検索')
    .addItem('主催者のカレンダー検索', 'main')
    .addToUi();
}
function isInvalidDate_(date: Date): boolean {
  const time: number = date.getTime();
  const res: boolean = Number.isNaN(time);
  return res;
}
function main() {
  const inputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('input');
  const outputSheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('output');
  if (inputSheet === null || outputSheet === null) {
    throw new Error('Sheet not found');
  }
  const targetEmail: string = inputSheet.getRange('B1').getValue();
  const startDate: string = inputSheet.getRange('B2').getValue();
  const endDate: string = inputSheet.getRange('B3').getValue();
  const guestFlag: boolean = inputSheet.getRange('B4').getValue() !== '';
  if (targetEmail === '' || startDate === '' || endDate === '') {
    throw new Error('Input is empty');
  }
  if (startDate > endDate) {
    throw new Error('Start date is later than end date');
  }
  if (
    isInvalidDate_(new Date(startDate)) ||
    isInvalidDate_(new Date(endDate))
  ) {
    throw new Error('Invalid date format');
  }
  const calendar: GoogleAppsScript.Calendar.Calendar =
    getOrganisersCalendar_(targetEmail);
  const events: GoogleAppsScript.Calendar.CalendarEvent[] = calendar.getEvents(
    new Date(startDate),
    new Date(endDate)
  );
  const organiserEvents: string[][] = events
    .map(event => {
      const usersWithoutOrganizer: GoogleAppsScript.Calendar.EventGuest[] =
        event.getGuestList();
      if (usersWithoutOrganizer.length === 0 && !guestFlag) {
        return null;
      }
      const eventSeries: string = event.isRecurringEvent()
        ? event.getEventSeries().getId()
        : '';
      const visibility: string =
        event.getVisibility() === CalendarApp.Visibility.PRIVATE
          ? '非公開'
          : '公開';
      const dateMap: Map<string, string> = getEventTimesInJST_(event);
      if (usersWithoutOrganizer.length === 0 && guestFlag) {
        return [
          event.getTitle(),
          dateMap.get('start') as string,
          dateMap.get('end') as string,
          targetEmail,
          visibility,
          'ゲストなし',
          eventSeries,
        ];
      }
      const users: GoogleAppsScript.Calendar.EventGuest[] =
        event.getGuestList(true);
      const checkOrganiser: boolean = getArrayDifference_(
        usersWithoutOrganizer,
        users,
        targetEmail
      );
      if (!checkOrganiser) {
        return null;
      }
      return [
        event.getTitle(),
        dateMap.get('start') as string,
        dateMap.get('end') as string,
        targetEmail,
        visibility,
        '',
        eventSeries,
      ];
    })
    .filter(event => event !== null);
  const uniqueData = removeDuplicateIDs_(organiserEvents);
  const header: string[] = [
    'Title',
    'Start Time',
    'End Time',
    'Organiser',
    'Public/Private',
    'memo',
  ];
  const outputValues: string[][] = [header, ...uniqueData];
  outputSheet.clear();
  outputSheet
    .getRange(1, 1, outputValues.length, header.length)
    .setValues(outputValues);
  outputSheet.activate();
}
function getArrayDifference_(
  usersWithoutOrganizer: GoogleAppsScript.Calendar.EventGuest[],
  users: GoogleAppsScript.Calendar.EventGuest[],
  organiser: string
): boolean {
  const usersWithoutOrganizerEmails: string[] = usersWithoutOrganizer.map(
    item => item.getEmail()
  );
  const usersEmails: string[] = users.map(item => item.getEmail());
  const diff1: string[] = usersEmails.filter(item => {
    return !usersWithoutOrganizerEmails.includes(item);
  });
  if (diff1.length === 0) {
    return false;
  }
  const result: boolean = diff1.some(item => item === organiser);
  return result;
}
function removeDuplicateIDs_(data: string[][]): string[][] {
  const sortIdx: number = 1;
  const targetIdx: number = 6;
  const idSet: Set<string> = new Set(data.map(row => row[targetIdx]));
  idSet.delete('');
  let uniqueData: string[][] = [];
  idSet.forEach(id => {
    const rows: string[][] = data.filter(row => row[targetIdx] === id);
    uniqueData.push([...rows[0]]);
  });
  const uniqueData2: string[][] = data.filter(row => row[targetIdx] === '');
  const finalData: string[][] = [...uniqueData, ...uniqueData2];

  // ソート
  finalData.sort((a, b) => {
    if (a[sortIdx] < b[sortIdx]) return -1;
    if (a[sortIdx] > b[sortIdx]) return 1;
    return 0;
  });
  const result: string[][] = finalData.map(row => {
    const newRow = [...row];
    newRow.splice(targetIdx, 1);
    return newRow;
  });

  return result;
}

function getEventTimesInJST_(
  event: GoogleAppsScript.Calendar.CalendarEvent
): Map<string, string> {
  const startTimeUTC: GoogleAppsScript.Base.Date = event.getStartTime();
  const endTimeUTC: GoogleAppsScript.Base.Date = event.getEndTime();

  const startTimeJST: Date = new Date(
    startTimeUTC.getTime() + 9 * 60 * 60 * 1000
  );
  const endTimeJST: Date = new Date(endTimeUTC.getTime() + 9 * 60 * 60 * 1000);
  const result: Map<string, string> = new Map([
    ['start', startTimeJST.toISOString().replace('Z', '+09:00')],
    ['end', endTimeJST.toISOString().replace('Z', '+09:00')],
  ]);
  return result;
}

function getOrganisersCalendar_(
  targetEmail: string
): GoogleAppsScript.Calendar.Calendar {
  const calendarList: GoogleAppsScript.Calendar.Calendar[] =
    CalendarApp.getAllCalendars();
  const targetCalendar: GoogleAppsScript.Calendar.Calendar[] =
    calendarList.filter(calendar => calendar.getName() === targetEmail);
  if (targetCalendar.length === 0) {
    throw new Error('Calendar not found');
  }
  return targetCalendar[0];
}
