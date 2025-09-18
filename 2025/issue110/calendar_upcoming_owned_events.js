let outputSs;
let mailMap;
let myMailAddress;

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu("カレンダー")
    .addItem("自分のイベント一覧を出力", "exportUpcomingOwnedEventsToSheet")
    .addToUi();
}

function exportUpcomingOwnedEventsToSheet() {
  // 自分のカレンダーを取得してイベント一覧シートに出力します
  const outputSpreadsheetId = SpreadsheetApp.getActiveSpreadsheet().getId();
  let outputSheet;
  [outputSs, outputSheet] = getSpreadSheetSheet_(
    outputSpreadsheetId,
    "イベント一覧"
  );
  mailMap = getMailAddressFromUserList_(outputSs);
  const myCalendar = getMyCalendar_();
  myMailAddress = myCalendar.getId();
  const apiEventItems = getListEvents_((calendar = myCalendar));
  const editItemsArray = apiEventItems
    .map((item) => editItems_(myCalendar, item, false))
    .filter((x) => x !== null);
  const header = [
    "タイトル",
    "ゲスト",
    "開始日時",
    "終了日時",
    "終日",
    "説明",
    "ID",
    "繰り返し",
    "イベントタイプ",
    "可視性",
    "主催者",
  ];
  outputSheet.clear();
  if (editItemsArray.length === 0) {
    outputSheet.getRange(1, 1, 1, header.length).setValues([header]);
    return;
  }
  const outputValues = [header, ...editItemsArray.flat()];
  outputSheet
    .getRange(1, 1, outputValues.length, header.length)
    .setValues(outputValues);
}
