function editItems_(myCalendar, item, outputSs) {
  const mailMap = getMailAddressFromUserList_(outputSs);
  const myMailAddress = myCalendar.getId();
  const organizer = item.organizer.email;
  if (organizer !== myMailAddress) {
    return null;
  }
  const { startTime, endTime, allday, recurrence } = getStartEndDate_(
    myCalendar,
    item
  );
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
  return [
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
}

function test() {
  // 自分のカレンダーを取得してイベント一覧シートに出力します
  const outputSpreadsheetId = getPropertyByKey_("outputSpreadsheetId");
  const [outputSs, outputSheet] = getSpreadSheetSheet_(
    outputSpreadsheetId,
    "イベント一覧"
  );
  const myCalendar = getMyCalendar_();
  const apiEventItems = getListEvents_((calendar = myCalendar));
  const editItemsArray = apiEventItems
    .map((item) => editItems_(myCalendar, item, outputSs))
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
  const outputValues = [header, ...editItemsArray];
  outputSheet.clear();
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
    return null;
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
    res["attendees"] = item.attendees.map((x) => x.email).join("; ");
    res["attachments"] = item.attachments;
    res["location"] = item.location;
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
  if (filteredRecurrenceEventItems.filter((x) => x !== null).length === 1) {
    if (startDateTimeList.length > 0) {
      const minDate = new Date(Math.min(...startDateTimeList));
      const maxDate = new Date(Math.max(...startDateTimeList));
      const formatDate = (date) =>
        `${date.getFullYear()}/${(date.getMonth() + 1)
          .toString()
          .padStart(2, "0")}/${date.getDate().toString().padStart(2, "0")}`;
      startEndText = `${startEndText}、開始日：${formatDate(
        minDate
      )}、終了日：${formatDate(maxDate)}`;
    }
    diffList = [Array(11).fill("")];
  } else {
    diffList = filteredRecurrenceEventItems
      .map((x, idx) => {
        if (x === null) {
          return null;
        }
        const res = recurrenceEventItems[idx];
        res[7] = recurrenceText;
        return res;
      })
      .filter((x) => x !== null);
  }
  return [startEndText, diffList];
}
function getStartEndDate_(calendar, item) {
  let startTime;
  let recurrence;
  const originalStartTime = item.originalStartTime;
  if (originalStartTime !== undefined) {
    if (item.start.timezone === "UTC") {
      startTime = new Date(
        new Date(originalStartTime.dateTime).getTime() + 9 * 60 * 60 * 1000
      ).toISOString();
    } else {
      startTime = originalStartTime.dateTime;
    }
    recurrence = true;
    //    const aaa = getRecurrence_(calendar, item);
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
  return { startTime, endTime, allday, recurrence };
}
