function editDate_(dateString) {
  const inputDate = convertUTCtoJST_(dateString);
  const [day, time] = inputDate.split(' ');
  const [hour, minute, _] = time.split(':');
  const outputDateString = `${day} ${Number(hour)}:${minute}`;
  return outputDateString;
}

function getSheetBySheetName_(sheetName) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (sheet !== null) {
    sheet.clearContents();
    return sheet;
  }
  const newSheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet();
  newSheet.setName(sheetName);
  return newSheet;
}

function getMainSheet_() {
  return SpreadsheetApp.getActiveSpreadsheet().getSheetByName('main');
}

function convertUTCtoJST_(utcDateString) {
  // UTC日付文字列をDateオブジェクトに変換
  const utcDate = new Date(utcDateString);

  // 日本標準時のタイムゾーンオフセット（UTC+9時間）を適用
  const jstOffset = 9 * 60 * 60 * 1000; // ミリ秒単位で9時間
  const jstDate = new Date(utcDate.getTime() + jstOffset);

  // JST日付文字列を返す
  const jstDateString = jstDate
    .toISOString()
    .replace(/T/, ' ')
    .replace(/\..+/, '');

  return jstDateString;
}

function isTodayOrEarlier_(dateString) {
  // 指定された文字列をDateオブジェクトに変換
  const inputDate = new Date(dateString);

  // 今日の日付を取得
  const today = new Date();

  // 入力された日付が今日以前（今日を含む）かどうかを確認
  return inputDate <= today;
}

function compareFunction_(a, b) {
  if (a[0] > b[0]) {
    return -1;
  }
  if (a[0] < b[0]) {
    return 1;
  }
  return 0;
}

function filterLatestDates_(data) {
  const filteredData = [];

  // ユーザーIDごとに最新の日付を持つ行を抽出する
  const userMap = new Map();
  data.forEach(row => {
    const userId = row[0];
    const dateStr = row[1];
    const currentDate = new Date(dateStr);

    // ユーザーIDが既にマップに存在する場合、より新しい日付を選択する
    if (userMap.has(userId)) {
      const existingDate = new Date(userMap.get(userId));
      if (currentDate > existingDate) {
        userMap.set(userId, dateStr);
      }
    } else {
      userMap.set(userId, dateStr);
    }
  });

  // マップの内容をフィルタリングされた配列に変換する
  userMap.forEach((dateStr, userId) => {
    filteredData.push([userId, dateStr]);
  });

  return filteredData;
}
