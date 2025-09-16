function createIcal_(
  title,
  description,
  id,
  startTime,
  endTime,
  isAllday,
  todayJST
) {
  const icalData = {
    BEGIN: "VEVENT",
    DESCRIPTION: description,
    UID: id,
    SUMMARY: title,
    "DTSTART;TZID=Tokyo Standard Time": startTime,
    "DTEND;TZID=Tokyo Standard Time": endTime,
    CLASS: "PUBLIC",
    DTSTAMP: todayJST,
    TRANSP: "OPAQUE",
    "X-MICROSOFT-CDO-ALLDAYEVENT": isAllday ? "TRUE" : "FALSE",
    "X-MICROSOFT-CDO-BUSYSTATUS": "BUSY",
    END: "VEVENT",
  };
  const icalString = Object.entries(icalData)
    .map(([key, value]) => `${key}:${value}`)
    .join("\n");

  return icalString;
}
function getMyCalendar_() {
  const calendarId = "primary"; // プライマリカレンダーのID
  const calendar = CalendarApp.getCalendarById(calendarId);

  if (!calendar) {
    throw new Error("カレンダーが見つかりませんでした。");
  }
  return calendar;
}
function getSpreadSheetSheet_(spreadSheetId, sheetName) {
  const ss = SpreadsheetApp.openById(spreadSheetId);
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    throw new Error(`シート「${sheetName}」が見つかりません。`);
  }
  return [ss, sheet];
}
function getPropertyByKey_(key) {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(`プロパティ「${key}」が見つかりません。`);
  }
  return value;
}
function getMailAddressFromUserList_(mailSs) {
  const userlistSsId = getPropertyByKey_("userlistSpreadsheetId");
  const [userListSs, userListSheet] = getSpreadSheetSheet_(
    userlistSsId,
    "Google"
  );
  const userList = userListSheet.getDataRange().getValues();
  const mailAddresses = userList
    .map((row) => [row[8], row[7]])
    .filter((x) => x[0] !== "" && x[1] !== "");
  const mailAddressMap = new Map(mailAddresses);
  const specialMailMap = getMailMapFromSheet_(mailSs);
  const mailMap = new Map([...mailAddressMap, ...specialMailMap]);
  return mailMap;
}
function getEventsAfterToday_() {
  const calendar = getMyCalendar_();
  const today = new Date();
  // 今日以降の全イベントを取得
  const events = calendar.getEvents(
    today,
    new Date(today.getFullYear() + 1, today.getMonth(), today.getDate())
  );
  return events;
}
function getTodayJst_() {
  // 今日の日付を取得
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayJST = Utilities.formatDate(
    today,
    "Asia/Tokyo",
    "yyyyMMdd'T'HHmmss"
  );
  return todayJST;
}
/**
 * スプレッドシートからメールアドレスの変換ルールを取得してMapを生成する
 * @returns {Map<string, string>} 変換ルールを含むMap
 */
function getMailMapFromSheet_(ss) {
  // 'mail'という名前のシートを取得
  const sheet = ss.getSheetByName("mail");

  // シートが見つからない場合はエラーを投げる
  if (!sheet) {
    throw new Error("「mail」という名前のシートが見つかりません。");
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
  mailAddresses.forEach((row) => {
    const oldAddress = row[0]; // A列の値
    const newAddress = row[1]; // B列の値

    // 両方のセルに値が入っている場合のみMapにセット
    if (oldAddress && newAddress) {
      mailMap.set(oldAddress, newAddress);
    }
  });

  return mailMap;
}
function edit_a_URL_(text) {
  if (text.trim() === "") {
    return text;
  }
  // <br>で分割
  const arrayBr = text
    .split(new RegExp("<br>", "i"))
    .filter((line) => line.trim() !== "");
  if (arrayBr.length === 0) {
    return text;
  }
  const arrayAtag = arrayBr
    .map((line) => {
      const removeTag = line.replace(/<\/?(?!(?:a|A)\b)[A-Za-z][^>]*>/gi, "");
      if (!new RegExp("<a href=", "i").test(removeTag)) {
        return removeTag;
      }
      const aArray = removeTag.split(/(<a\s+href\s*=|<\/a>)/i);
      const filteredAArray = aArray.filter(
        (part) =>
          part.trim() !== "" &&
          part.trim() !== "<a href=" &&
          part.trim() !== "</a>"
      );
      const splitAArray = filteredAArray.map((x) => x.split(">")).flat();
      const cleaningedAArray = splitAArray.map((x) => {
        const temp = x.replace(/^"([^"]*)".*$/, "$1");
        const finalUrl = extractFinalUrl_(temp);
        return finalUrl;
      });
      const uniqueAArray = [...new Set(cleaningedAArray)];
      return uniqueAArray;
    })
    .flat()
    .join("\n");
  return arrayAtag;
}
/**
 * 受け取ったテキストから最終URLを抽出（GAS対応）
 * - GoogleのリダイレクトURLなら q= の値を返す
 * - それ以外は見つかったURLをそのまま返す
 * - URLが見つからないときは text をそのまま返す
 */
function extractFinalUrl_(text) {
  if (typeof text !== "string") return text; // 文字列じゃなければそのまま

  // &amp; → &
  const decoded = text.replace(/&amp;/gi, "&");

  // URLらしき部分を検索
  const match = decoded.match(/https?:\/\/[^\s"'<>\]]+/i);
  if (!match) {
    // URLが含まれていない → 受け取ったテキストをそのまま返す
    return text;
  }

  const candidate = match[0];

  // GoogleのリダイレクトURLなら q= の値を抽出
  if (candidate.indexOf("://www.google.com/url") > -1) {
    const qMatch = candidate.match(/[?&]q=([^&]+)/i);
    if (qMatch) {
      const qUrl = decodeURIComponent(qMatch[1]);
      if (/^https?:\/\//i.test(qUrl)) {
        return qUrl; // q の値が有効な URL
      }
    }
  }

  // それ以外は候補をそのまま返す
  return candidate;
}
function getEvents_(calendarId) {
  // Advanced Google Services の Calendar API を使用
  const calendar = Calendar.Calendars.get(calendarId); // カレンダーが存在するか確認
  if (!calendar) {
    throw new Error("カレンダーが見つかりません。");
  }
  let events = [];
  let pageToken = null;
  // 最大10ページまで取得（1ページあたり300件、合計3000件）
  for (let i = 0; i < 10; i++) {
    const options = {
      timeMin: new Date().toISOString(),
      maxResults: 300,
    };
    if (pageToken !== null) {
      options.pageToken = pageToken;
    }
    const temp = Calendar.Events.list(calendarId, options);
    events = events.concat(temp.items);
    if (!temp.nextPageToken) {
      break;
    }
    pageToken = temp.nextPageToken;
  }
  if (!events || events.length === 0) {
    return [];
  }
  return events;
}
function getEventAttachments_(events, eventId) {
  /**
      // Advanced Google Services の Calendar API を使用
  const calendar = Calendar.Calendars.get(calendarId); // カレンダーが存在するか確認
  if (!calendar) {
    throw new Error("カレンダーが見つかりません。");
  }
  const event = Calendar.Events.list(calendarId=calendarId, {
    iCalUID: eventId
  });
  return event.items[0].attachments || []; // attachments[] を返す

    *  */
}
