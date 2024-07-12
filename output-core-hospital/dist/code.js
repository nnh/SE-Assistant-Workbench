//ドキュメントフォルダID
const docId = PropertiesService.getScriptProperties().getProperty('docId');
//保存するフォルダID
const folderId =
  PropertiesService.getScriptProperties().getProperty('folderId');

function toPDFs() {
  let doc_Folder = DriveApp.getFolderById(docId);

  files = doc_Folder.getFiles();
  while (files.hasNext()) {
    var buff = files.next();
    // var attr = '???';
    try {
      var doc = DocumentApp.openById(buff.getId());
      let pdf_name = buff.getName() + '.pdf';
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
}
function onOpen() {
  const ui = DocumentApp.getUi();
  const menu = ui.createMenu('中核申請書出力');
  menu.addItem('中核申請書出力', 'toPDFs');
  menu.addToUi();
}
