function getToken_() {
  const accountid =
    PropertiesService.getScriptProperties().getProperty('accountId');
  const clientid =
    PropertiesService.getScriptProperties().getProperty('clientId');
  const clientsecret =
    PropertiesService.getScriptProperties().getProperty('clientSecret');
  const utf8EncodedString = Utilities.newBlob(
    `${clientid}:${clientsecret}`
  ).getBytes();
  const basenc = Utilities.base64Encode(utf8EncodedString);

  const options = {
    method: 'post',
    contentType: 'application/x-www-form-urlencoded',
    headers: {
      Authorization: 'Basic ' + basenc,
    },
    payload: {
      grant_type: 'account_credentials',
      account_id: accountid,
    },
  };

  const response = UrlFetchApp.fetch('https://zoom.us/oauth/token', options);
  const statusCode = response.getResponseCode();
  const responseBody = response.getContentText();

  if (statusCode == 200) {
    const obj = JSON.parse(responseBody);
    const accessToken = obj.access_token;
    return accessToken;
  } else {
    console.log('Request failed. Status code: ' + statusCode);
    return null; // or throw an error if you prefer
  }
}
function getMeetingList_(valuesSoFar, accessToken, nextPageToken) {
  const userId = PropertiesService.getScriptProperties().getProperty('userId');
  const baseUrl = `https://api.zoom.us/v2/users/${userId}/meetings?page_size=300`;
  const url =
    nextPageToken !== ''
      ? `${baseUrl}&next_page_token=${nextPageToken}`
      : baseUrl;
  const response = UrlFetchApp.fetch(url, {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  });
  const meetingList = JSON.parse(response.getContentText());
  if (meetingList.next_page_token !== '') {
    const updatedValues =
      valuesSoFar !== null
        ? [...valuesSoFar, ...meetingList.meetings]
        : meetingList.meetings;
    return getMeetingList_(
      updatedValues,
      accessToken,
      meetingList.next_page_token
    );
  } else {
    // 再帰のベースケース: 最終ページの場合、合計の結果を返す
    return valuesSoFar !== null
      ? [...valuesSoFar, ...meetingList.meetings]
      : meetingList.meetings;
  }
}

function getRegistrationList_(
  meetingId,
  valuesSoFar,
  accessToken,
  nextPageToken
) {
  const options = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  };
  const baseUrl = `https://api.zoom.us/v2/meetings/${meetingId}/registrants?page_size=300`;
  const url =
    nextPageToken !== ''
      ? `${baseUrl}&next_page_token=${nextPageToken}`
      : baseUrl;
  try {
    const registrantsResponse = UrlFetchApp.fetch(url, options);
    const registrantsInfo = JSON.parse(registrantsResponse.getContentText());

    if (registrantsInfo.next_page_token !== '') {
      const updatedValues =
        valuesSoFar !== null
          ? [...valuesSoFar, ...registrantsInfo.registrants]
          : registrantsInfo.registrants;
      return getRegistrationList_(
        meetingId,
        updatedValues,
        accessToken,
        registrantsInfo.next_page_token
      );
    } else {
      // 再帰のベースケース: 最終ページの場合、合計の結果を返す
      return valuesSoFar !== null
        ? [...valuesSoFar, ...registrantsInfo.registrants]
        : registrantsInfo.registrants;
    }
  } catch (e) {
    return null;
  }
}

function getParticipantList_(
  meetingId,
  valuesSoFar,
  accessToken,
  nextPageToken
) {
  const options = {
    method: 'get',
    headers: {
      Authorization: 'Bearer ' + accessToken,
    },
  };
  const baseUrl = `https://api.zoom.us/v2/report/meetings/${meetingId}/participants?page_size=300`;
  const url =
    nextPageToken !== ''
      ? `${baseUrl}&next_page_token=${nextPageToken}`
      : baseUrl;

  const userInfoResponse = UrlFetchApp.fetch(url, options);
  const userInfo = JSON.parse(userInfoResponse.getContentText());

  if (userInfo.next_page_token !== '') {
    const updatedValues =
      valuesSoFar !== null
        ? [...valuesSoFar, ...userInfo.participants]
        : userInfo.participants;
    return getParticipantList_(
      meetingId,
      updatedValues,
      accessToken,
      userInfo.next_page_token
    );
  } else {
    // 再帰のベースケース: 最終ページの場合、合計の結果を返す
    return valuesSoFar !== null
      ? [...valuesSoFar, ...userInfo.participants]
      : userInfo.participants;
  }
}
