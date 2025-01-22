//ドキュメントフォルダID
const docId = PropertiesService.getScriptProperties().getProperty('docId');
//保存するフォルダID
const folderId =
  PropertiesService.getScriptProperties().getProperty('folderId');
// 統合ファイル
const pdfHeader = '臨床研究中核病院申請資料';
const pdfExtension = 'pdf';
const excludedFileName = new RegExp(
  `${pdfHeader}\\s[0-9]{8}\\.${pdfExtension}`
);

function moveOldFiles_(outputFolder) {
  const pdfFiles = outputFolder.getFilesByType(MimeType.PDF);
  let pdfFileCount = 0;
  while (pdfFiles.hasNext()) {
    const pdfFile = pdfFiles.next();
    if (!excludedFileName.test(pdfFile.getName())) {
      pdfFileCount++;
    }
  }
  if (pdfFileCount === 0) {
    return;
  }
  // 処理日時を名前とする新しいフォルダを作成
  const now = new Date();
  const timestamp = Utilities.formatDate(
    now,
    Session.getScriptTimeZone(),
    'yyyyMMdd_HHmmss'
  );
  const archive = DriveApp.getFolderById(
    PropertiesService.getScriptProperties().getProperty('archiveFolderId')
  );
  const archiveFolder = archive.createFolder('Archive_' + timestamp);
  // 出力先フォルダの下にあるPDFファイルを新しいフォルダに移動
  const pdfFiles2 = outputFolder.getFilesByType(MimeType.PDF);
  while (pdfFiles2.hasNext()) {
    const pdfFile = pdfFiles2.next();
    if (!excludedFileName.test(pdfFile.getName())) {
      pdfFile.moveTo(archiveFolder);
    }
  }
}

function toPDFs() {
  const doc_Folder = DriveApp.getFolderById(docId);
  const outputFolder = DriveApp.getFolderById(folderId);
  moveOldFiles_(outputFolder);
  // PDF作成
  files = doc_Folder.getFiles();
  while (files.hasNext()) {
    const buff = files.next();
    // var attr = '???';
    try {
      const doc = DocumentApp.openById(buff.getId());
      const pdf_name = buff.getName() + '.pdf';
      createPdf_(doc.getId(), pdf_name, folderId);
      console.log('OK: ' + buff.getName());
    } catch (e) {
      console.log(buff.getName());
      console.log(e);
    }
  }
  Utilities.sleep(60000);
  // PDFを結合する
  mergeFiles_(folderId);
  moveOldFiles_(outputFolder);
}
function onOpen() {
  const ui = DocumentApp.getUi();
  const menu = ui.createMenu('中核申請書出力');
  menu.addItem('中核申請書出力', 'toPDFs');
  menu.addToUi();
}
