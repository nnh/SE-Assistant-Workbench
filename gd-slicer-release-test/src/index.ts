const targetList: string[] = [
  'gd-slicer-test-zenkaku',
  'gd-slicer-test-splitLanguageen',
  'gd-slicer-test-splitLanguagejp',
  'gd-slicer-test-splitMultipleLanguage_5',
  'gd-slicer-test-splitMultipleLanguage_4',
  'gd-slicer-test-splitMultipleLanguage_3',
  'gd-slicer-test-splitMultipleLanguage_2',
];
function compareDocs() {
  const isInternalFileMap = getTargetDocsMap_('isInternal');
  const isPublicFileMap = getTargetDocsMap_('isPublic');
  targetList.forEach((fileName: string) => {
    if (!isInternalFileMap.has(fileName) || !isPublicFileMap.has(fileName)) {
      console.log(fileName);
      throw new Error('File not found');
    }
    const isInternalDoc: GoogleAppsScript.Document.Document =
      isInternalFileMap.get(fileName)!;
    const isPublicDoc: GoogleAppsScript.Document.Document =
      isPublicFileMap.get(fileName)!;
    const isInternalTexts: string[] = getTargetDocsText_(isInternalDoc);
    const isPublicTexts: string[] = getTargetDocsText_(isPublicDoc);
    if (isInternalTexts.length !== isPublicTexts.length) {
      console.log(fileName);
      throw new Error('Different number of paragraphs');
    }
    isInternalTexts.forEach((isInternalText: string, index: number) => {
      const isPublicText: string = isPublicTexts[index];
      if (isInternalText !== isPublicText) {
        console.log(fileName);
        throw new Error('Different text');
      }
    });
  });
  console.log('All files are the same');
}
function getTargetDocsText_(doc: GoogleAppsScript.Document.Document): string[] {
  const paragraphs: GoogleAppsScript.Document.Paragraph[] = doc
    .getBody()
    .getParagraphs();
  const texts: string[] = paragraphs.map(paragraph => paragraph.getText());
  return texts;
}
function getTargetDocsMap_(
  key: string
): Map<string, GoogleAppsScript.Document.Document> {
  const folderId: string = getFolderId_(key);
  const folder: GoogleAppsScript.Drive.Folder = getFolderById_(folderId);
  const files: GoogleAppsScript.Drive.FileIterator =
    getTargetFileIterator_(folder);
  const targetFiles: Map<string, GoogleAppsScript.Document.Document> =
    getTargetFilesByFileIterator_(files);
  return targetFiles;
}
function getFolderId_(key: string): string {
  const folderId: string | null =
    PropertiesService.getScriptProperties().getProperty(key);
  if (!folderId) {
    throw new Error('Folder ID is not set');
  }
  return folderId;
}
function getFolderById_(folderId: string): GoogleAppsScript.Drive.Folder {
  const folder: GoogleAppsScript.Drive.Folder =
    DriveApp.getFolderById(folderId);
  if (!folder) {
    throw new Error('Folder not found');
  }
  console.log(folder.getName());
  return folder;
}
function getTargetFileIterator_(
  folder: GoogleAppsScript.Drive.Folder
): GoogleAppsScript.Drive.FileIterator {
  const files: GoogleAppsScript.Drive.FileIterator = folder.getFiles();
  if (!files.hasNext()) {
    throw new Error('No files found');
  }
  return files;
}
function getTargetFilesByFileIterator_(
  files: GoogleAppsScript.Drive.FileIterator
): Map<string, GoogleAppsScript.Document.Document> {
  const targetFiles: Map<string, GoogleAppsScript.Document.Document> =
    new Map();
  while (files.hasNext()) {
    const file: GoogleAppsScript.Drive.File = files.next();
    if (targetList.includes(file.getName())) {
      const doc: GoogleAppsScript.Document.Document = DocumentApp.openById(
        file.getId()
      );
      targetFiles.set(file.getName(), doc);
    }
  }
  return targetFiles;
}
