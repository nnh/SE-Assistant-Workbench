function getPropertyById_(id: string): string {
  const property: string | null =
    PropertiesService.getScriptProperties().getProperty(id);
  if (property === null) {
    throw new Error('Property not found');
  }
  return property;
}

function getSpreadsheetById_(
  id: string
): GoogleAppsScript.Spreadsheet.Spreadsheet {
  const ss: GoogleAppsScript.Spreadsheet.Spreadsheet | null =
    SpreadsheetApp.openById(id);
  if (ss === null) {
    throw new Error('Spreadsheet not found');
  }
  return ss;
}

function getSheetByName_(
  ss: GoogleAppsScript.Spreadsheet.Spreadsheet,
  name: string
): GoogleAppsScript.Spreadsheet.Sheet {
  const sheet: GoogleAppsScript.Spreadsheet.Sheet | null =
    ss.getSheetByName(name);
  if (sheet === null) {
    throw new Error('Sheet not found');
  }
  return sheet;
}

class GetYearString {
  private today: Date;
  private year: number;
  constructor() {
    this.today = new Date();
    this.year = this.today.getFullYear();
  }
  public getThisYearString(): string {
    return this.year.toString();
  }
  public getLastYearString(): string {
    return (this.year - 1).toString();
  }
}
function getYears_(): {
  thisYear: string;
  lastYear: string;
} {
  const year = new GetYearString();
  return {
    thisYear: year.getThisYearString(),
    lastYear: year.getLastYearString(),
  };
}

function addDropdownToCColumnWithOptions_(
  range: GoogleAppsScript.Spreadsheet.Range,
  options: string[]
): void {
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(options, true) // 引数のリストを選択肢として設定
    .setAllowInvalid(true) // 無効な値を許可し、警告のみ表示
    .build();
  range.setDataValidation(rule);
}
