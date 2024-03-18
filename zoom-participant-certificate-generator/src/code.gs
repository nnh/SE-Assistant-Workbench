function execGetParticipantList() {
  const googleUserList = SpreadsheetApp.openById(
    PropertiesService.getScriptProperties().getProperty('googleUserListId')
  )
    .getSheetByName('Google')
    .getDataRange()
    .getValues();
  if (googleUserList === null) {
    return;
  }
  const mainSheet = getMainSheet_();
  if (mainSheet === null) {
    return;
  }
  const meetingId = mainSheet.getRange('C1').getValue();
  if (!/[0-9]{11}/.test(meetingId)) {
    return;
  }
  const meetingTopic = mainSheet.getRange('B1').getValue();
  if (meetingTopic === '') {
    return;
  }
  const outputSheet = getSheetBySheetName_(meetingTopic);
  const token = getToken_();
  if (token === null) {
    return;
  }
  const participantList = getParticipantList_(meetingId, '', token, '');
  if (participantList === null) {
    return;
  }
  const registrationList = getRegistrationList_(meetingId, '', token, '');
  const registration = getRegistrationData_(registrationList);
  const userList = editParticipantList_(
    participantList,
    googleUserList,
    registration
  );
  outputSheet.clearContents();
  if (userList.length === 0) {
    return;
  }
  outputSheet
    .getRange(1, 1, userList.length, userList[0].length)
    .setValues(userList);
  outputSheet.activate();
  SpreadsheetApp.flush();
  outputSheet.autoResizeColumns(1, userList[0].length);
}

function getRegistrationData_(registrationList) {
  if (registrationList === null) {
    return null;
  }
  const registrationKey = filterLatestDates_(
    registrationList.map(x => [x.email, x.create_time])
  );
  const res = registrationKey.map(([email, _]) => {
    const target = registrationList.filter(x => x.email === email)[0];
    return [email, target.custom_questions];
  });
  return new Map(res);
}

function execGetMeetingList() {
  const mainSheet = getMainSheet_();
  if (mainSheet === null) {
    return;
  }
  const meetingListSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName('ミーティングリスト');
  if (meetingListSheet === null) {
    return;
  }
  meetingListSheet.clearContents();
  const token = getToken_();
  if (token === null) {
    return;
  }
  const meetingList = getMeetingList_('', token, '');
  if (meetingList === null) {
    return;
  }
  const meetingListJst = meetingList.map(meeting => {
    let res = meeting;
    res.start_time = convertUTCtoJST_(meeting.start_time);
    return res;
  });
  const targetMeetings = meetingListJst.filter(meeting =>
    isTodayOrEarlier_(meeting.start_time)
  );
  const meetingIdAndTopicAndStartTime = targetMeetings
    .map(meeting => [`${meeting.start_time}_${meeting.topic}`, meeting.id])
    .sort(compareFunction_);
  if (meetingIdAndTopicAndStartTime.length === 0) {
    return;
  }
  meetingListSheet
    .getRange(
      1,
      1,
      meetingIdAndTopicAndStartTime.length,
      meetingIdAndTopicAndStartTime[0].length
    )
    .setValues(meetingIdAndTopicAndStartTime);
  const ruleOptions = meetingListSheet
    .getRange(1, 1, meetingListSheet.getLastRow(), 1)
    .getValues()
    .flat();

  const ruleRange = mainSheet.getRange('B1');
  if (ruleRange.getDataValidation() != null) {
    ruleRange.clearDataValidations();
  }
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ruleOptions)
    .setAllowInvalid(false)
    .build();
  ruleRange.setDataValidation(rule);
}

function editParticipantList_(participantList, googleUserList, registration) {
  const googleUserListIndex = new Map([
    ['name', 1],
    ['email', 8],
  ]);
  const googleEmailAndNameMap = new Map(
    googleUserList.map(x => [
      x[googleUserListIndex.get('email')],
      x[googleUserListIndex.get('name')],
    ])
  );
  const emailList = [
    ...new Set(participantList.map(x => x.user_email).filter(x => x !== '')),
  ];
  const userList = emailList.map(email => {
    const user = participantList.filter(x => x.user_email === email);
    const time = user
      .map(
        x => `${editDate_(x.join_time)} 
    〜 ${editDate_(x.leave_time)}`
      )
      .join(', ');
    const googleName = googleEmailAndNameMap.has(email)
      ? googleEmailAndNameMap.get(email)
      : '';
    const custom_questions =
      registration !== null ? registration.get(email).map(x => x.value) : null;
    const res = [user[0].name, email, googleName, time];
    if (custom_questions !== null) {
      return [...res, ...custom_questions];
    }
    return res;
  });
  const userListNoEmail = participantList
    .filter(x => x.user_email === '')
    .map(x => {
      const time = `${editDate_(x.join_time)} 〜 ${editDate_(x.leave_time)}`;
      const res = [x.name, '', '', time];
      return res;
    });
  const baseHeaders = ['登録名', 'メールアドレス', '氏名', '参加時間'];
  const headers =
    registration !== null
      ? [...baseHeaders, ...registration.get(emailList[0]).map(x => x.title)]
      : baseHeaders;
  const outputData = [headers, ...userList, ...userListNoEmail];
  return outputData;
}

function onOpen() {
  execGetMeetingList();
  SpreadsheetApp.getUi()
    .createMenu('Zoomレポート出力')
    .addItem('参加者リスト出力', 'execGetParticipantList')
    .addItem('ミーティングリスト取得', 'execGetMeetingList')
    .addToUi();
}
