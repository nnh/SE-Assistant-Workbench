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
function getMyCalendar_() {
  const calendarId = "primary"; // プライマリカレンダーのID
  const calendar = CalendarApp.getCalendarById(calendarId);

  if (!calendar) {
    throw new Error("カレンダーが見つかりませんでした。");
  }
  return calendar;
}
function getEvents_(calendar, eventId) {
  const event = Calendar.Events.get(calendar.getId(), eventId);
  if (!event) {
    throw new Error(`イベントID「${eventId}」のイベントが見つかりません。`);
  }
  return event;
}
function getListEvents_(calendar, singleEvents = false, icalUID = null) {
  // Advanced Google Services の Calendar API を使用
  let events = [];
  let pageToken = null;
  // 最大10ページまで取得（1ページあたり300件、合計3000件）
  for (let i = 0; i < 10; i++) {
    const options = {
      timeMin: new Date().toISOString(),
      maxResults: 300,
      singleEvents: singleEvents,
    };
    if (pageToken !== null) {
      options.pageToken = pageToken;
    }
    if (icalUID !== null) {
      options.iCalUID = icalUID;
    }
    const calendarId = calendar.getId();
    const temp = Calendar.Events.list(calendarId, options);
    events = events.concat(temp.items);
    if (!temp.nextPageToken) {
      break;
    }
    pageToken = temp.nextPageToken;
    if (i === 9 && temp.nextPageToken) {
      console.warn(
        "Warning: More pages exist beyond the maximum limit. Some events may not be retrieved."
      );
    }
  }
  if (!events || events.length === 0) {
    return [];
  }
  return events;
}
/**
 * iCalendarのRRULEを日本語の文章に変換する
 *
 * @param {string} rrule RRULE文字列
 * @return {string} 日本語の説明
 */
function rruleToJapanese_(rrule) {
  if (!rrule || !rrule.startsWith("RRULE:")) {
    return "RRULEではありません";
  }

  // "RRULE:" を外す
  const body = rrule.replace(/^RRULE:/, "");
  const parts = {};
  body.split(";").forEach((p) => {
    const [key, value] = p.split("=");
    parts[key] = value;
  });

  // 曜日のマッピング
  const dayMap = {
    MO: "月曜",
    TU: "火曜",
    WE: "水曜",
    TH: "木曜",
    FR: "金曜",
    SA: "土曜",
    SU: "日曜",
  };

  let text = "";

  // FREQに応じて
  switch (parts.FREQ) {
    case "DAILY":
      text =
        parts.INTERVAL && parts.INTERVAL !== "1"
          ? `${parts.INTERVAL}日ごとに繰り返し`
          : "毎日繰り返し";
      break;

    case "WEEKLY":
      // BYDAYの曜日を翻訳
      const days = parts.BYDAY
        ? parts.BYDAY.split(",")
            .map((d) => dayMap[d] || d)
            .join("・")
        : "（曜日指定なし）";

      const interval =
        parts.INTERVAL && parts.INTERVAL !== "1"
          ? `${parts.INTERVAL}週ごと`
          : "毎週";

      text = `${days}${interval}に繰り返し`;
      break;

    case "MONTHLY":
      text =
        parts.INTERVAL && parts.INTERVAL !== "1"
          ? `${parts.INTERVAL}か月ごとに繰り返し`
          : "毎月繰り返し";
      break;

    case "YEARLY":
      text =
        parts.INTERVAL && parts.INTERVAL !== "1"
          ? `${parts.INTERVAL}年ごとに繰り返し`
          : "毎年繰り返し";
      break;

    default:
      text = "対応していないFREQです";
  }

  return text;
}
function getStartEndDate_(calendar, item, recurrenceFlag = false) {
  let startTime;
  let recurrence = false;
  let recurrenceArray = null;
  let minDate = null;
  let maxDate = null;
  const originalStartTime = item.originalStartTime;
  if (originalStartTime !== undefined) {
    if (item.start.timezone === "UTC") {
      startTime = new Date(
        new Date(originalStartTime.dateTime).getTime() + 9 * 60 * 60 * 1000
      ).toISOString();
    } else {
      startTime = originalStartTime.dateTime;
    }
    if (!recurrenceFlag) {
      recurrence = true;
      [recurrenceArray, minDate, maxDate] = getRecurrence_(calendar, item);
      if (recurrenceArray === null) {
        return {
          startTime: null,
          endTime: null,
          allday: null,
          recurrence: null,
          recurrenceArray: null,
        };
      }
    }
  } else {
    if (item.start.timezone === "UTC") {
      startTime = new Date(
        new Date(item.start.dateTime).getTime() + 9 * 60 * 60 * 1000
      ).toISOString();
    } else {
      startTime = item.start.dateTime;
    }
    recurrence = false;
  }
  let allday;
  let endTime;
  if (startTime === undefined) {
    allday = true;
    startTime = new Date(item.start.date).toISOString();
    endTime = new Date(item.end.date).toISOString();
  } else {
    allday = false;
    if (item.end.timezone === "UTC") {
      endTime = new Date(
        new Date(item.end.dateTime).getTime() + 9 * 60 * 60 * 1000
      ).toISOString();
    } else {
      endTime = item.end.dateTime;
    }
  }
  if (minDate !== null) {
    startTime = Utilities.formatDate(
      new Date(minDate),
      "Asia/Tokyo",
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );
  }
  if (maxDate !== null) {
    endTime = Utilities.formatDate(
      new Date(maxDate),
      "Asia/Tokyo",
      "yyyy-MM-dd'T'HH:mm:ssXXX"
    );
  }
  return { startTime, endTime, allday, recurrence, recurrenceArray };
}
function getRecurrence_(calendar, item) {
  const recurrenceEvent = getEvents_(calendar, item.recurringEventId);
  const recurrences = recurrenceEvent.recurrence;
  const recurrenceText =
    recurrences !== undefined
      ? recurrences.map((r) => rruleToJapanese_(r)).join("\n")
      : "";
  const recurrenceEventIcalUid = recurrenceEvent.iCalUID;
  const recurrenceEventItems = getListEvents_(
    calendar,
    true,
    recurrenceEventIcalUid
  );
  if (recurrenceEventItems.length === 0) {
    return [null, null, null];
  }
  const startDateTimeList = recurrenceEventItems.map(
    (item) => new Date(item.start.dateTime)
  );
  const testRecurrenceEventItems = recurrenceEventItems.map((item) => {
    const startDateTime = new Date(item.start.dateTime)
      .toTimeString()
      .slice(0, 8); // "HH:MM:SS"形式
    const endDateTime = new Date(item.end.dateTime).toTimeString().slice(0, 8); // "HH:MM:SS"形式
    const res = {};
    res["title"] = item.summary;
    res["description"] = item.description;
    res["startDateTime"] = startDateTime;
    res["endDateTime"] = endDateTime;
    res["attendees"] =
      item.attendees !== undefined
        ? item.attendees.map((x) => x.email).join("; ")
        : "";
    res["attachments"] =
      item.attachments !== undefined
        ? item.attachments.map((a) => a.fileUrl).join("; ")
        : "";
    return res;
  });
  const filteredRecurrenceEventItems = [];
  for (let i = 0; i < testRecurrenceEventItems.length; i++) {
    const current = testRecurrenceEventItems[i];
    const prev = i > 0 ? testRecurrenceEventItems[i - 1] : null;
    if (prev && JSON.stringify(current) === JSON.stringify(prev)) {
      filteredRecurrenceEventItems.push(null);
    } else {
      filteredRecurrenceEventItems.push(current);
    }
  }
  let startEndText = recurrenceText;
  let diffList = [];
  let minDate;
  let maxDate;
  if (filteredRecurrenceEventItems.filter((x) => x !== null).length === 1) {
    if (startDateTimeList.length > 0) {
      minDate = new Date(Math.min(...startDateTimeList));
      maxDate = new Date(Math.max(...startDateTimeList));
      const formatDate = (date) =>
        `${date.getFullYear()}/${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
      startEndText = `${startEndText}、開始日：${formatDate(
        minDate
      )}、終了日：${formatDate(maxDate)}`;
    }
    diffList = [Array(11).fill("")];
    diffList[0][7] = startEndText;
  } else {
    diffList = filteredRecurrenceEventItems
      .map((x, idx) => {
        if (x === null) {
          return null;
        }
        const res = editItems_(calendar, recurrenceEventItems[idx], true);
        if (!res || res.length === 0) {
          return null;
        }
        for (let j = 0; j < res.length; j++) {
          res[j][7] = recurrenceText;
        }
        return res.flat();
      })
      .filter((x) => x !== null);
  }
  return [diffList, minDate, maxDate];
}
function editItems_(myCalendar, item, recurrenceFlag = false) {
  const organizer = item.organizer.email;
  if (organizer !== myMailAddress) {
    return null;
  }
  const { startTime, endTime, allday, recurrence, recurrenceArray } =
    getStartEndDate_(myCalendar, item, recurrenceFlag);
  if (startTime === null || endTime === null) {
    return null;
  }
  if (new Date(startTime) < new Date()) {
    return null;
  }
  const id = item.iCalUID;
  let attachments = "";
  if (item.attachments !== undefined) {
    attachments = item.attachments
      .map((attachment) => [attachment.title, attachment.fileUrl].join("\n"))
      .join("\n");
  }
  let guests;
  if (item.attendees) {
    guests = item.attendees
      .map((x) => {
        const mail1 = x.getEmail();
        if (!mailMap.has(mail1)) {
          return mail1;
        }
        const mail2 = mailMap.get(mail1);
        const res = `${mail1}; ${mail2}`;
        return res;
      })
      .join("; ");
  } else {
    guests = "";
  }
  const description = item.description || "";
  const editDescription = edit_a_URL_(description);
  let descriptionArray = [];
  if (attachments !== "") {
    descriptionArray.push(attachments);
  }
  if (editDescription !== "") {
    descriptionArray.push(editDescription);
  }
  const outputDescription = descriptionArray.join("\n");
  const eventType = item.eventType;
  const title = item.summary;
  const visibility = item.visibility;
  const array = [
    title,
    guests,
    startTime,
    endTime,
    allday,
    outputDescription,
    id,
    recurrence,
    eventType,
    visibility,
    organizer,
  ];
  const res =
    recurrence && recurrenceArray !== null
      ? [array, ...recurrenceArray]
      : [array];
  return res;
}
