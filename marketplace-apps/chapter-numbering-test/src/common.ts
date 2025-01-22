const testDocId: string = 'testDocId';
function getProperty_(key: string): string {
  const value = PropertiesService.getScriptProperties().getProperty(key);
  if (!value) {
    throw new Error(key + ' is not set.');
  }
  return value;
}
function getDocument_(id: string): GoogleAppsScript.Document.Document {
  const doc: GoogleAppsScript.Document.Document = DocumentApp.openById(id);
  if (!doc) {
    throw new Error('Document is not found.');
  }
  return doc;
}
