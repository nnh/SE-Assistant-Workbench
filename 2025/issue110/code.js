function exportCalendarEventsToIcal() {
  const calendarId = "primary"; // プライマリカレンダーのID
  const calendar = CalendarApp.getCalendarById(calendarId);
  
  if (!calendar) {
    console.log("カレンダーが見つかりませんでした。");
    return;
  }
  const userlistSsId = PropertiesService.getScriptProperties().getProperty("userlistSpreadsheetId");
  const userListSheet = SpreadsheetApp.openById(userlistSsId).getSheetByName("Google");
  const userList = userListSheet.getDataRange().getValues();
  const mailAddresses = userList.map(row => [row[8], row[7]]).filter(x => x[0] !== "" && x[1] !== "");
  const mailAddressMap = new Map(mailAddresses);
  const outputSpreadsheetId = PropertiesService.getScriptProperties().getProperty("outputSpreadsheetId");
  const outputSs = SpreadsheetApp.openById(outputSpreadsheetId);
  const outputSheet = outputSs.getSheetByName("出力");
  const specialMailMap = getMailMapFromSheet_(outputSs); 
  const mailMap = new Map([...mailAddressMap, ...specialMailMap]);

  outputSheet.clear();

  // 今日の日付を取得
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // 今日以降の全イベントを取得
  const events = calendar.getEvents(today, new Date(today.getFullYear() + 1, today.getMonth(), today.getDate()));
  
  const eventsArray = events.map(event => {
    const title = event.getTitle();
    if (title === "8:40~16:25勤務") {
      return(null);
    }
    if (title === "自宅") {
      return(null);
    }
    if (title === "日次処理") {
      return(null);
    }
    if (title === "日次　リマインド") {
      return(null);
    }
    if (title === "dummy") {
      return(null);
    }

    
    // 日本標準時で時刻を取得・フォーマット
    const startTimeJST = Utilities.formatDate(event.getStartTime(), "Asia/Tokyo", "yyyyMMdd'T'HHmmss");
    const endTimeJST = Utilities.formatDate(event.getEndTime(), "Asia/Tokyo", "yyyyMMdd'T'HHmmss");
    const id = event.getId();
    // ゲストを取得
    const guests = event.getGuestList(true).map(x => {
      const mail1 =x.getEmail()
      if (!mailMap.has(mail1)) {
        return mail1;
      }
      const mail2 = mailMap.get(mail1);
      const res = `${mail1}, ${mail2}`;
      return res;
    }).join(", ");
    const res = [id, title, startTimeJST, endTimeJST, guests];
    return res;
  }).filter(x => x !== null);
  const header = ["id", "タイトル", "開始日時","終了日時","ゲスト"];
  // ヘッダーを eventsArray の先頭に追加
  eventsArray.unshift(header);
  const outputValues = eventsArray;  
  if (eventsArray.length > 0) {
    outputSheet.getRange(1, 1, outputValues.length, outputValues[0].length).setValues(outputValues);
  }
}

/**
 * スプレッドシートからメールアドレスの変換ルールを取得してMapを生成する
 * @returns {Map<string, string>} 変換ルールを含むMap
 */
function getMailMapFromSheet_(ss) {
  // 'mail'という名前のシートを取得
  const sheet = ss.getSheetByName('mail');

  // シートが見つからない場合はエラーを投げる
  if (!sheet) {
    throw new Error('「mail」という名前のシートが見つかりません。');
  }

  // A列（旧アドレス）とB列（新アドレス）のデータを取得
  // getRange(行, 列, 行数, 列数)
  // ここではヘッダーを除外して2行目から最終行までを取得
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    // データがない場合は空のMapを返す
    return new Map();
  }

  // 1行目のヘッダーを除いてデータを取得
  const mailAddresses = sheet.getRange(2, 1, lastRow - 1, 2).getValues();

  // 取得した二次元配列をMapに変換
  const mailMap = new Map();
  mailAddresses.forEach(row => {
    const oldAddress = row[0]; // A列の値
    const newAddress = row[1]; // B列の値

    // 両方のセルに値が入っている場合のみMapにセット
    if (oldAddress && newAddress) {
      mailMap.set(oldAddress, newAddress);
    }
  });

  return mailMap;
}

