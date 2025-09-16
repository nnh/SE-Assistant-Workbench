function test() {
  // 自分のカレンダーを取得してイベント一覧シートに出力します
  const outputSpreadsheetId = getPropertyByKey_("outputSpreadsheetId");
  const [outputSs, outputSheet] = getSpreadSheetSheet_(
    outputSpreadsheetId,
    "イベント一覧"
  );
  const mailMap = getMailAddressFromUserList_(outputSs);
  const myCalendar = getMyCalendar_();
  const myMailAddress = myCalendar.getId();
  const apiEventItems = getEvents_(myCalendar);
  const test = apiEventItems
    .map((item) => {
      const organizer = item.organizer.email;
      if (organizer !== myMailAddress) {
        return null;
      }
      let startTime;
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
      if (new Date(startTime) < new Date()) {
        return null;
      }
      const id = item.iCalUID;
      let attachments = "";
      if (item.attachments !== undefined) {
        attachments = item.attachments
          .map((attachment) =>
            [attachment.title, attachment.fileUrl].join("\n")
          )
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
    })
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
  const outputValues = [header, ...test];
  outputSheet.clear();
  outputSheet
    .getRange(1, 1, outputValues.length, header.length)
    .setValues(outputValues);
}
