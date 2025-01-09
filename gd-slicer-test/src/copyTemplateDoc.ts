const documentHeader = 'gd-slicer-test-';
function copyTemplateDoc() {
  const templateDocIdMap: Map<string, GoogleAppsScript.Document.Document> =
    getTemplateDocIdList_();
  const newDocs: Map<string, GoogleAppsScript.Document.Document> =
    copyGoogleDocs_(templateDocIdMap);
}
function copyGoogleDocs_(
  templateMap: Map<string, GoogleAppsScript.Document.Document>
): Map<string, GoogleAppsScript.Document.Document> {
  const result: Map<string, GoogleAppsScript.Document.Document> = new Map();
  templateMap.forEach(
    (templateDoc: GoogleAppsScript.Document.Document, categoryCode: string) => {
      const templateDocId: string = templateDoc.getId();
      try {
        const sourceDoc: GoogleAppsScript.Drive.File =
          DriveApp.getFileById(templateDocId);
        const newDocName: string = `${documentHeader}${categoryCode}_${new Date().toLocaleString()}`;
        const copiedFile: GoogleAppsScript.Drive.File =
          sourceDoc.makeCopy(newDocName);
        const copiedDoc: GoogleAppsScript.Document.Document =
          DocumentApp.openById(copiedFile.getId());
        result.set(categoryCode, copiedDoc);
        PropertiesService.getScriptProperties().setProperty(
          `${testDocIdHead}${categoryCode}`,
          copiedFile.getId()
        );
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
  );
  return result;
}

function getTemplateDocIdList_(): Map<
  string,
  GoogleAppsScript.Document.Document
> {
  const getTargetProperties: GetTargetProperties = new GetTargetProperties();
  const templateDocIdList: string[] =
    getTargetProperties.getproperties(templateDocIdHead);
  const templateDocs: GoogleAppsScript.Document.Document[] =
    templateDocIdList.map(templateDocId => getDocument_(templateDocId));
  const templateDocMap: Map<string, GoogleAppsScript.Document.Document> =
    new Map();
  for (let i = 0; i < templateDocs.length; i++) {
    templateDocMap.set(getTargetProperties.categoryCodes[i], templateDocs[i]);
  }
  return templateDocMap;
}
