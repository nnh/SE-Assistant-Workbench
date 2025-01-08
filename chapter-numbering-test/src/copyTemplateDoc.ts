function copyTemplateDoc() {
  const newDoc: GoogleAppsScript.Document.Document = copyGoogleDoc_();
  PropertiesService.getScriptProperties().setProperty(
    testDocId,
    newDoc.getId()
  );
}
function copyGoogleDoc_(): GoogleAppsScript.Document.Document {
  const templateDocId: string = getTemplateDocId_();
  try {
    const sourceDoc: GoogleAppsScript.Drive.File =
      DriveApp.getFileById(templateDocId);
    const newDocName: string =
      'chapter-numbering-test_' + new Date().toLocaleString();
    const copiedDoc: GoogleAppsScript.Drive.File =
      sourceDoc.makeCopy(newDocName);
    const result: GoogleAppsScript.Document.Document = DocumentApp.openById(
      copiedDoc.getId()
    );
    return result;
  } catch (e) {
    if (e instanceof Error) {
      throw new Error('Failed to copy the Google Doc: ' + e.message);
    } else {
      throw new Error(
        'Failed to copy the Google Doc: An unknown error occurred.'
      );
    }
  }
}
function getTemplateDocId_(): string {
  const templateDocId = getProperty_('templateDocId');
  const templateDoc: GoogleAppsScript.Document.Document =
    getDocument_(templateDocId);
  return templateDoc.getId();
}
