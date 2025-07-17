function getAllParticipants_(meetingId, access_token) {
  const instanceUrl = `https://api.zoom.us/v2/past_meetings/${meetingId}/instances`;
  const headers = {
    Authorization: 'Bearer ' + access_token,
  };

  // 開催されたミーティングインスタンスの一覧を取得
  const response = UrlFetchApp.fetch(instanceUrl, { method: 'get', headers });
  const instanceData = JSON.parse(response.getContentText());

  const allParticipants = [];

  // 各UUIDに対して参加者情報を取得
  for (const instance of instanceData.meetings) {
    const uuid = encodeURIComponent(instance.uuid); // UUIDはエンコード必須
    const baseUrl = `https://api.zoom.us/v2/report/meetings/${uuid}/participants?page_size=300`;
    const getZoomData = new GetZoomData(baseUrl, access_token);
    const participants = getZoomData.getDataList(null, '', getZoomData, 'participants');

    if (participants !== null) {
      allParticipants.push(...participants);
    }
  }

  return allParticipants;
}
