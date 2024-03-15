function main() {
  const accountid =
    PropertiesService.getScriptProperties().getProperty('accountId');
  const clientid =
    PropertiesService.getScriptProperties().getProperty('clientId');
  const clientsecret =
    PropertiesService.getScriptProperties().getProperty('clientSecret');
  const utf8EncodedString = Utilities.newBlob(
    `${clientid}:${clientsecret}`
  ).getBytes();
  const base64EncodedString = Utilities.base64Encode(utf8EncodedString);

  const token = getToken_(accountid, base64EncodedString);
  if (token === null) {
    return;
  }
  test(token);
}

function getToken_(accountid, basenc) {
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
function test(accessToken) {
  // 取得したアクセストークンを使用してZoom APIからユーザー情報を取得
  const userInfoResponse = UrlFetchApp.fetch(
    'https://api.zoom.us/v2/users/me',
    {
      method: 'get',
      headers: {
        Authorization: 'Bearer ' + accessToken,
      },
    }
  );
  const userInfo = JSON.parse(userInfoResponse.getContentText());
  console.log(userInfo);
  return userInfo;
}
