const templateDocIdHead: string = 'templateDocId_';
const testDocIdHead: string = 'testDocId_';
const splitLanguage: string = 'splitLanguage';
const splitMultipleLanguage: string = 'splitMultipleLanguage';
const documentHeader = 'gd-slicer-test-';
const testFolderId = 'testFolderId';

class GetTargetProperties {
  categoryCodes: string[];

  constructor() {
    this.categoryCodes = [splitLanguage, splitMultipleLanguage, 'zenkaku'];
  }

  getProperty_(key: string): string {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    if (!value) {
      throw new Error(key + ' is not set.');
    }
    return value;
  }
  getPropertiesMap(head: string): Map<string, string> {
    const propertiesMap: Map<string, string> = new Map();
    this.categoryCodes.forEach(categoryCode => {
      const category = `${head}${categoryCode}`;
      const property = this.getProperty_(category);
      propertiesMap.set(category, property);
    });
    return propertiesMap;
  }
}

class DriveAccessor {
  constractor() {}
  getFolderById_(id: string): GoogleAppsScript.Drive.Folder {
    const folder: GoogleAppsScript.Drive.Folder = DriveApp.getFolderById(id);
    if (!folder) {
      throw new Error('Folder is not found.');
    }
    return folder;
  }
  getFilesByFolderId_(folderId: string): GoogleAppsScript.Drive.FileIterator {
    const folder: GoogleAppsScript.Drive.Folder = this.getFolderById_(folderId);
    const files: GoogleAppsScript.Drive.FileIterator = folder.getFiles();
    return files;
  }
  getFileByFileName_(
    fileName: string,
    folderId: string
  ): GoogleAppsScript.Drive.File {
    const files: GoogleAppsScript.Drive.FileIterator =
      this.getFilesByFolderId_(folderId);
    let file: GoogleAppsScript.Drive.File | null = null;
    while (files.hasNext()) {
      const f: GoogleAppsScript.Drive.File = files.next();
      if (f.getName() === fileName) {
        file = f;
        break;
      }
    }
    if (file === null) {
      throw new Error('File is not found.');
    }
    return file;
  }
}

class DocFetcher {
  getTargetProperties: GetTargetProperties;
  driveAccessor: DriveAccessor;
  constructor() {
    this.getTargetProperties = new GetTargetProperties();
    this.driveAccessor = new DriveAccessor();
  }
  getDocument_(docId: string): GoogleAppsScript.Document.Document {
    const doc: GoogleAppsScript.Document.Document = DocumentApp.openById(docId);
    if (!doc) {
      throw new Error('Document is not found.');
    }
    return doc;
  }
  getDocumentByName_(
    docName: string,
    folderId: string
  ): GoogleAppsScript.Document.Document {
    const file = this.driveAccessor.getFileByFileName_(docName, folderId);
    const doc: GoogleAppsScript.Document.Document = this.getDocument_(
      file.getId()
    );
    return doc;
  }
  getParagraphTextsByDocId_(docId: string): string[] {
    const doc: GoogleAppsScript.Document.Document = this.getDocument_(docId);
    return this.getParagraphTexts_(doc);
  }
  getParagraphTexts_(doc: GoogleAppsScript.Document.Document): string[] {
    const body: GoogleAppsScript.Document.Body = doc.getBody();
    const result: string[] = body
      .getParagraphs()
      .map(paragraph => paragraph.getText());
    // Bodyの全てのテキストが取得できていることを確認する
    const bodyText = body.getText().replace(/\s+/g, '');
    const paragraphTexts = result.join('').replace(/\s+/g, '');
    if (paragraphTexts !== bodyText) {
      throw new Error('Failed to get all paragraph texts.');
    }
    return result;
  }
}
