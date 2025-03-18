function saveHtmlToDrive_() {
  const folderId =
    PropertiesService.getScriptProperties().getProperty("folderId");
  const folder = DriveApp.getFolderById(folderId);
  const url = "https://nho.hosp.go.jp/about/cnt1-0_000103.html";
  const response = UrlFetchApp.fetch(url);
  const html = response.getContentText("UTF-8"); // UTF-8 で取得

  // GoogleドライブにHTMLファイルを保存
  const file = folder.createFile("hospital_names.html", html, "text/html"); // MIMEタイプを 'text/html' に指定
}
