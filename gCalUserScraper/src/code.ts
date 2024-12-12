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
      if (usersWithoutOrganizer.length === 0) {
        if (guestFlag) {
          return [
            event.getTitle(),
            event.getStartTime().toISOString(),
            event.getEndTime().toISOString(),
            targetEmail,
            'ゲストなし',
          ];
        } else {
          return null;
        }
      }
      const users: GoogleAppsScript.Calendar.EventGuest[] =
        event.getGuestList(true);
      const checkOrganiser: boolean = getArrayDifference(
        usersWithoutOrganizer,
        users,
        targetEmail
      );
      if (!checkOrganiser) {
        return null;
      }
      return [
        event.getTitle(),
        event.getStartTime().toISOString(),
        event.getEndTime().toISOString(),
        targetEmail,
        '',
      ];
    })
    .filter(event => event !== null);
  const header: string[] = [
    'Title',
    'Start Time',
    'End Time',
    'Organiser',
    'memo',
  ];
  const outputValues: string[][] = [header, ...organiserEvents];
  outputSheet.clear();
  outputSheet
    .getRange(1, 1, outputValues.length, header.length)
    .setValues(outputValues);
  outputSheet.activate();
}
function getArrayDifference(
  usersWithoutOrganizer: GoogleAppsScript.Calendar.EventGuest[],
  users: GoogleAppsScript.Calendar.EventGuest[],
  Organiser: string
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
  const result: boolean = diff1.some(item => item === Organiser);
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
