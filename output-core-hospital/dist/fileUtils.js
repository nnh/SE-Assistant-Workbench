function checkFileType_(fileId) {
  const file = DriveApp.getFileById(fileId);
  const mimeType = file.getMimeType();
  return mimeType;
}
class ConvertToPdf {
  constructor(targetFolderId) {
    this.folder = DriveApp.getFolderById(targetFolderId);
  }
  getFile(fileId) {
    return fileId;
  }
  createPdf(fileId, newFileName) {
    const file = this.getFile(fileId);
    if (file === fileId) {
      return;
    }
    this.folder.createFile(file.getAs('application/pdf')).setName(newFileName);
  }
}
class ConvertDocToPdf extends ConvertToPdf {
  getFile(fileId) {
    return DocumentApp.openById(fileId);
  }
  exportDocsToPDF_(fileId, newFileName, options) {
    const baseUrl = `https://docs.google.com/document/d/${fileId}/export?id=${fileId}`;
    const url = baseUrl;
    const token = ScriptApp.getOAuthToken();
    const fetchOptions = {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
    const blob = UrlFetchApp.fetch(url, fetchOptions)
      .getBlob()
      .setName(newFileName);
    this.folder.createFile(blob);
  }
  exportDocsToHtml_(fileId) {
    const blob = DriveApp.getFileById(fileId).getAs(MimeType.HTML);
    this.folder.createFile(blob);
  }
}
