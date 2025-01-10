function createFolderForTest_(): void {
  const thisFolderId: string = new GetTargetProperties().getProperty_(
    'thisFolderId'
  );
  const thisFolder: GoogleAppsScript.Drive.Folder =
    DriveApp.getFolderById(thisFolderId);
  if (thisFolder === null) {
    throw new Error('The folder is not found.');
  }
  const folderName: string = `${documentHeader}${new Date().toLocaleString()}`;
  const folder: GoogleAppsScript.Drive.Folder =
    DriveApp.createFolder(folderName);
  PropertiesService.getScriptProperties().setProperty(
    testFolderId,
    folder.getId()
  );
  folder.moveTo(thisFolder);
}
function copyTemplateDoc() {
  const templateDocIdMap: Map<string, GoogleAppsScript.Document.Document> =
    getTemplateDocIdList_();
  createFolderForTest_();
  copyGoogleDocs_(templateDocIdMap);
}
function copyGoogleDocs_(
  templateMap: Map<string, GoogleAppsScript.Document.Document>
) {
  templateMap.forEach(
    (templateDoc: GoogleAppsScript.Document.Document, categoryCode: string) => {
      const templateDocId: string = templateDoc.getId();
      try {
        const copyToFolderId: string = new GetTargetProperties().getProperty_(
          testFolderId
        );
        const copyToFolder: GoogleAppsScript.Drive.Folder =
          DriveApp.getFolderById(copyToFolderId);
        const sourceDoc: GoogleAppsScript.Drive.File =
          DriveApp.getFileById(templateDocId);
        const newDocName: string = `${documentHeader}${categoryCode}`;
        const copiedFile: GoogleAppsScript.Drive.File =
          sourceDoc.makeCopy(newDocName);
        copiedFile.moveTo(copyToFolder);
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
}

function getTemplateDocIdList_(): Map<
  string,
  GoogleAppsScript.Document.Document
> {
  const getTargetProperties: GetTargetProperties = new GetTargetProperties();
  const templateDocIdMap: Map<string, string> =
    getTargetProperties.getPropertiesMap(templateDocIdHead);
  const templateDocIdList: string[] = [...templateDocIdMap.values()];
  const docFetcher: DocFetcher = new DocFetcher();
  const templateDocs: GoogleAppsScript.Document.Document[] =
    templateDocIdList.map(templateDocId =>
      docFetcher.getDocument_(templateDocId)
    );
  const templateDocMap: Map<string, GoogleAppsScript.Document.Document> =
    new Map();
  for (let i = 0; i < templateDocs.length; i++) {
    templateDocMap.set(getTargetProperties.categoryCodes[i], templateDocs[i]);
  }
  return templateDocMap;
}
