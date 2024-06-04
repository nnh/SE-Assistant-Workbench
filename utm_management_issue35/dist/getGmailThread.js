function getGmailThreadByTitleMain() {
  const outputSheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
  const targetTitle = ['SINET接続許可依頼書送信のお願い'];
  const titleList = new Set(targetTitle);
  titleList.forEach(targetTitle =>
    getGmailThreadByTitle_(targetTitle, outputSheet)
  );
}
function getThreadByTitle_(title) {
  // Define the search query
  const searchQuery = `subject:(${title})`;
  // Search for Gmail threads matching the criteria
  return GmailApp.search(searchQuery);
}
function getGmailThreadByTitle_(title, outputSheet) {
  const threads = getThreadByTitle_(title);
  if (threads.length === 0) {
    return;
  }
  const res = threads.map(thread => [
    thread.getMessages()[0].getDate(),
    thread.getMessages()[0].getPlainBody(),
  ]);
  outputSheet.clear();
  outputSheet.getRange(1, 1, res.length, res[0].length).setValues(res);
}
