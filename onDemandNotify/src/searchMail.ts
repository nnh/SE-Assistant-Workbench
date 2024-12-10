const targetDate: string = getTargetDate_();
function getTargetDate_(): string {
  // 現在の日時を取得
  const currentDate: Date = new Date();
  const oneDayAgo: Date = new Date(currentDate);
  oneDayAgo.setDate(currentDate.getDate() - 1);
  // メールの検索条件を指定
  const targetDate: string = Utilities.formatDate(
    oneDayAgo,
    'GMT',
    'yyyy/MM/dd'
  );
  return targetDate;
}
function getQuery_(titlePattern: string, mailAddress: string | null): string {
  let query: string = '';
  query = query + `subject:${titlePattern}`;
  query = query + ` after: ${targetDate}`;
  if (mailAddress !== null) {
    query = query + ` to:${mailAddress}`;
  }
  return query;
}
function getRecentEmail_(
  subjectText: string,
  titlePattern: string,
  mailAddress: string | null,
  documentUrl: string
) {
  const query = getQuery_(titlePattern, mailAddress);

  // メールを検索
  const threads = GmailApp.search(query);

  if (threads.length === 0) {
    return;
  }
  const postText = `${subjectText}\n${documentUrl}`;
  // chatにドキュメントを送信
  sendWorkInformationToChat_(postText);
}
function sendWorkInformationToChat_(strPayload: string): void {
  // Webhook URL
  const postUrl: string | null =
    PropertiesService.getScriptProperties().getProperty('chatTargetUrl');
  if (!postUrl) {
    throw new Error('chatTargetUrl is not set');
  }

  const payload: {
    text: string;
  } = {
    text: strPayload,
  };

  const options: GoogleAppsScript.URL_Fetch.URLFetchRequestOptions = {
    method: 'post',
    headers: { 'Content-Type': 'application/json; charset=UTF-8' },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  const response = UrlFetchApp.fetch(postUrl, options);
  console.log(response.getContentText()); // レスポンスをログに記録する
}
