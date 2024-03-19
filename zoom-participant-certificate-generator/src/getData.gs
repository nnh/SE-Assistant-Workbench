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

class GetZoomData {
  constructor(baseUrl, accessToken) {
    this.baseUrl = baseUrl;
    this.accessToken = accessToken;
  }
  getJsonData(nextPageToken) {
    const url =
      nextPageToken !== ''
        ? `${this.baseUrl}&next_page_token=${nextPageToken}`
        : this.baseUrl;
    try {
      const response = UrlFetchApp.fetch(url, {
        method: 'get',
        headers: {
          Authorization: 'Bearer ' + this.accessToken,
        },
      });
      const dataJson = JSON.parse(response.getContentText());
      return dataJson;
    } catch (e) {
      return null;
    }
  }
  getDataList(valuesSoFar, nextPageToken, getZoomData, targetProperty) {
    const dataJson = getZoomData.getJsonData(nextPageToken);
    if (dataJson === null) {
      return null;
    }
    if (
      dataJson.next_page_token !== '' &&
      dataJson.next_page_token !== undefined
    ) {
      const updatedValues =
        valuesSoFar !== null
          ? [...valuesSoFar, ...dataJson[targetProperty]]
          : dataJson[targetProperty];
      return this.getDataList(
        updatedValues,
        dataJson.next_page_token,
        getZoomData,
        targetProperty
      );
    } else {
      // 再帰のベースケース: 最終ページの場合、合計の結果を返す
      return valuesSoFar !== null
        ? [...valuesSoFar, ...dataJson[targetProperty]]
        : dataJson[targetProperty];
    }
  }
}

function getMeetingList_(access_token) {
  const userId = PropertiesService.getScriptProperties().getProperty('userId');
  const baseUrl = `https://api.zoom.us/v2/users/${userId}/meetings?page_size=300`;
  const getZoomData = new GetZoomData(baseUrl, access_token);
  const res = getZoomData.getDataList(null, '', getZoomData, 'meetings');
  return res;
}

function getRegistrationList_(meetingId, access_token) {
  const baseUrl = `https://api.zoom.us/v2/meetings/${meetingId}/registrants?page_size=300`;
  const getZoomData = new GetZoomData(baseUrl, access_token);
  const res = getZoomData.getDataList(null, '', getZoomData, 'registrants');
  return res;
}

function getParticipantList_(meetingId, access_token) {
  const baseUrl = `https://api.zoom.us/v2/report/meetings/${meetingId}/participants?page_size=300`;
  const getZoomData = new GetZoomData(baseUrl, access_token);
  const res = getZoomData.getDataList(null, '', getZoomData, 'participants');
  return res;
}

function getSurveyList_(meetingId, access_token) {
  const baseUrl = `https://api.zoom.us/v2/report/meetings/${meetingId}/survey?page_size=300`;
  const getZoomData = new GetZoomData(baseUrl, access_token);
  const res = getZoomData.getDataList(null, '', getZoomData, 'survey_answers');
  if (res === undefined) {
    return null;
  }
  return res;
}
