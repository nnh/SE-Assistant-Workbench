const templateDocIdHead: string = 'templateDocId_';
const testDocIdHead: string = 'testDocId_';
const splitLanguage: string = 'splitLanguage';
const splitMultipleLanguage: string = 'splitMultipleLanguage';
const documentHeader = 'gd-slicer-test-';
const testFolderId = 'testFolderId';
function getDocument_(id: string): GoogleAppsScript.Document.Document {
  const doc: GoogleAppsScript.Document.Document = DocumentApp.openById(id);
  if (!doc) {
    throw new Error('Document is not found.');
  }
  return doc;
}
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
