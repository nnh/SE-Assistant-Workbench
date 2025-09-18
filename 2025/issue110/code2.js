let outputSs;
let mailMap;
let myMailAddress;
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

function test() {
  // 自分のカレンダーを取得してイベント一覧シートに出力します
  const outputSpreadsheetId = getPropertyByKey_("outputSpreadsheetId");
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
