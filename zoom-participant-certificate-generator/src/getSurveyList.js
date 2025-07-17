function getSurveyListAllInstances_(meetingId, access_token) {
  const instanceUrl = `https://api.zoom.us/v2/past_meetings/${meetingId}/instances`;
  const headers = {
    Authorization: 'Bearer ' + access_token,
  };

  // 全ての開催回（UUID）の取得
  const response = UrlFetchApp.fetch(instanceUrl, { method: 'get', headers });
  const instanceData = JSON.parse(response.getContentText());

  const allSurveys = [];

  for (const instance of instanceData.meetings) {
    const uuid = encodeURIComponent(instance.uuid); // UUIDはURLエンコード必須
    const baseUrl = `https://api.zoom.us/v2/report/meetings/${uuid}/survey?page_size=300`;
    const getZoomData = new GetZoomData(baseUrl, access_token);

    const surveyAnswers = getZoomData.getDataList(
      null,
      '',
      getZoomData,
      'survey_answers'
    );

    if (surveyAnswers !== null && surveyAnswers !== undefined) {
      // 開催回情報を付加して保存
      const taggedAnswers = surveyAnswers.map(answer => ({
        ...answer,
        meeting_uuid: instance.uuid,
        start_time: instance.start_time,
      }));
      allSurveys.push(...taggedAnswers);
    }
  }

  return allSurveys;
}
