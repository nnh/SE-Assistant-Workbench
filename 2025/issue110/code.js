function getEventByName() {
  const targetTitle = "解析プログラマー打ち合わせ";
  const outputSpreadsheetId = getPropertyByKey_("outputSpreadsheetId");
  const [outputSs, outputSheet] = getSpreadSheetSheet_(
    outputSpreadsheetId,
    "テスト"
  );
  const events = getEventsAfterToday_();
  const targetEvent = events.filter(
    (event) => event.getTitle() === targetTitle
  );
  const google = targetEvent.filter((event) =>
    event.getId().endsWith("@google.com")
  );
  const others = targetEvent.filter(
    (event) => !event.getId().endsWith("@google.com")
  );

  console.log(targetEvent);
}

function exportCalendarEventsToIcal() {
  // 自分のカレンダーを取得してイベント一覧シートに出力します
  const outputSpreadsheetId = getPropertyByKey_("outputSpreadsheetId");
  const [outputSs, outputSheet] = getSpreadSheetSheet_(
    outputSpreadsheetId,
    "イベント一覧"
  );
  const mailMap = getMailAddressFromUserList_(outputSs);
  const events = getEventsAfterToday_();
  let uniqueCheck = new Set();
  outputSheet.clear();

  const eventsArray = events
    .map((event) => {
      const title = event.getTitle();
      if (title === "8:40~16:25勤務") {
        return null;
      }
      if (title === "自宅") {
        return null;
      }
      if (title === "日次処理") {
        return null;
      }
      if (title === "日次　リマインド") {
        return null;
      }
      if (title === "dummy") {
        return null;
      }

      // 日本標準時で時刻を取得・フォーマット
      const startTimeJST = Utilities.formatDate(
        event.getStartTime(),
        "Asia/Tokyo",
        "yyyyMMdd'T'HHmmss"
      );
      const endTimeJST = Utilities.formatDate(
        event.getEndTime(),
        "Asia/Tokyo",
        "yyyyMMdd'T'HHmmss"
      );
      const id = event.getId();
      const series = uniqueCheck.has(id);
      uniqueCheck.add(id);
      // ゲストを取得
      const guests = event
        .getGuestList(true)
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
      const owner = event.isOwnedByMe();
      const isAllday =
        startTimeJST.endsWith("T000000") && endTimeJST.endsWith("T000000");
      // description内の全ての改行コードを\nに置換（複数連続も全て置換）
      const description = event.getDescription();
      const replaceAtagDescription = edit_a_URL_(description);
      const safeDescription = replaceAtagDescription
        ? replaceAtagDescription //.replace(/(\r\n|\r|\n)+/g, "\\n")
        : "";
      const todayJST = getTodayJst_();
      const ical = !series
        ? createIcal_(
            title,
            safeDescription,
            id,
            startTimeJST,
            endTimeJST,
            isAllday,
            todayJST
          )
        : "";

      const res = [
        id,
        title,
        safeDescription,
        startTimeJST,
        endTimeJST,
        guests,
        owner,
        isAllday,
        series,
        ical,
      ];
      return res;
    })
    .filter((x) => x !== null);
  const header = [
    "id",
    "タイトル",
    "内容",
    "開始日時",
    "終了日時",
    "ゲスト",
    "オーナーフラグ",
    "終日フラグ",
    "繰り返しフラグ",
    "iCal",
  ];
  // outlookから登録されたイベントを除外
  const filteredEventsArray = eventsArray.filter((event) =>
    event[0].endsWith("@google.com")
  );
  // ヘッダーを filteredEventsArray の先頭に追加
  filteredEventsArray.unshift(header);
  const outputValues = filteredEventsArray;
  if (filteredEventsArray.length > 0) {
    outputSheet
      .getRange(1, 1, outputValues.length, outputValues[0].length)
      .setValues(outputValues);
  }
}
