const mapTargetAddress = new Map([['meetingTopic', 'B1']]);
const outputDataIndex = new Map([['email', 1]]);
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
  const meetingTopic = mainSheet
    .getRange(mapTargetAddress.get('meetingTopic'))
    .getValue();
  if (meetingTopic === '') {
    return;
  }
  const outputSheet = getSheetBySheetName_(meetingTopic);
  const token = getToken_();
  if (token === null) {
    return;
  }
  const participantList = getParticipantList_(meetingId, token);
  if (participantList === null) {
    return;
  }
  const registrationList = getRegistrationList_(meetingId, token);
  const registration = getEmailAndDetails_(
    registrationList,
    'create_time',
    'custom_questions'
  );
  const surveyList = getSurveyList_(meetingId, token);
  const survey = getEmailAndDetails_(surveyList, 'date_time', 'answer_details');
  const userList = editParticipantList_(
    participantList,
    googleUserList,
    registration,
    survey
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
function getEmailAndDetails_(targetList, filterName, detailName) {
  if (targetList === null) {
    return null;
  }
  const targetKey = filterLatestDates_(
    targetList.map(x => [x.email, x[filterName]])
  );
  // Get maximum number of responses
  const detailLength = targetList.map(target => target[detailName].length);
  const areAllEqual = detailLength.every((x, _, arr) => x === arr[0]);
  const editTargetList = !areAllEqual
    ? setArrayDummy_(targetList, detailName)
    : targetList;
  const res = targetKey.map(([email, _]) => {
    const target = editTargetList.filter(x => x.email === email)[0];
    return [email, target[detailName]];
  });
  return new Map(res);
}

function setArrayDummy_(targetList, detailName) {
  const indexIdx = 1;
  const targetData = targetList
    .map((target, index) => [target[detailName].length, index])
    .sort((a, b) => b[0] - a[0]);
  const target = targetList[targetData[0][indexIdx]];
  const targetKeys = target[detailName].map(x => Object.keys(x))[0];
  const targetHeader = targetKeys[0];
  const targetBody = targetKeys[1];
  const header = target[detailName].map(x => x[targetHeader]);
  const res = targetList.map(target => {
    const editArray = header.map(head => {
      const test = target[detailName]
        .map(x => (x[targetHeader] === head ? x : null))
        .filter(x => x !== null);
      if (test.length === 0) {
        const obj = {};
        obj[targetHeader] = head;
        obj[targetBody] = '';
        return obj;
      } else {
        return test[0];
      }
    });
    target[detailName] = editArray;
    return target;
  });
  return res;
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
  const meetingList = getMeetingList_(token);
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

  const ruleRange = mainSheet.getRange(mapTargetAddress.get('meetingTopic'));
  if (ruleRange.getDataValidation() != null) {
    ruleRange.clearDataValidations();
  }
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInList(ruleOptions)
    .setAllowInvalid(false)
    .build();
  ruleRange.setDataValidation(rule);
}

function editParticipantList_(
  participantList,
  googleUserList,
  registration,
  survey
) {
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
    const res = [user[0].name, email, googleName, time];
    const custom_questions = getValuesFromMap_(registration, email, 'value');
    if (custom_questions === null) {
      return res;
    }
    const answer_details = getValuesFromMap_(survey, email, 'answer');
    if (answer_details !== null) {
      return [...res, ...custom_questions, ...answer_details];
    }
    return [...res, ...custom_questions];
  });
  const absenteesList = getAbsenteesList_(registration, emailList, userList);
  const userListNoEmail = participantList
    .filter(x => x.user_email === '')
    .map(x => {
      const time = `${editDate_(x.join_time)} 〜 ${editDate_(x.leave_time)}`;
      const res = [x.name, '', '', time];
      return res;
    });
  const baseHeaders = ['登録名', 'メールアドレス', '氏名', '参加時間'];
  const headers_base_reg =
    registration !== null
      ? [...baseHeaders, ...registration.get(emailList[0]).map(x => x.title)]
      : baseHeaders;
  let surveyHeader = null;
  if (survey !== null) {
    for (let i = 0; i < emailList.length; i++) {
      surveyHeader = survey.has(emailList[i])
        ? survey.get(emailList[i]).map(x => x.question)
        : null;
      if (surveyHeader !== null) {
        break;
      }
    }
  }
  const headers =
    surveyHeader !== null
      ? [...headers_base_reg, ...surveyHeader]
      : baseHeaders;
  const outputData = [
    headers,
    ...userList,
    ...userListNoEmail,
    ...absenteesList,
  ];
  return outputData;
}

function getAbsenteesList_(registration, emailList, userList) {
  if (registration === null) {
    return new Array(0);
  }
  const emailSet = new Set(emailList);
  const absenteesUserList = Array.from(registration)
    .map(([email, _]) => (!emailSet.has(email) ? email : null))
    .filter(x => x !== null);
  if (absenteesUserList.length === 0) {
    return new Array(0);
  }
  const res = absenteesUserList.map(email => {
    let dummy = new Array(userList[0].length).fill('');
    dummy[outputDataIndex.get('email')] = email;
    return dummy;
  });
  return res;
}
function getValuesFromMap_(targetMap, key, valueName) {
  if (targetMap === null) {
    return null;
  }
  if (targetMap.has(key)) {
    const res = targetMap.get(key).map(x => x[[valueName]]);
    return res;
  }
  const dummyArray = targetMap
    .entries()
    .next()
    .value[1].map(_ => '');
  return dummyArray;
}

function onOpen() {
  execGetMeetingList();
  SpreadsheetApp.getUi()
    .createMenu('Zoomレポート出力')
    .addItem('参加者リスト出力', 'execGetParticipantList')
    .addItem('ミーティングリスト取得', 'execGetMeetingList')
    .addToUi();
}
