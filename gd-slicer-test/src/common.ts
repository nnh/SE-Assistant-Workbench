const templateDocIdHead: string = 'templateDocId_';
const testDocIdHead: string = 'testDocId_';
function getDocument_(id: string): GoogleAppsScript.Document.Document {
  const doc: GoogleAppsScript.Document.Document = DocumentApp.openById(id);
  if (!doc) {
    throw new Error('Document is not found.');
  }
  return doc;
}
function test20250109() {
  const getTargetProperties = new GetTargetProperties();
  const properties = getTargetProperties.getproperties(templateDocIdHead);
  console.log(properties);
}
class GetTargetProperties {
  categoryCodes: string[];

  constructor() {
    this.categoryCodes = ['splitLanguage', 'splitMultipleLanguage', 'zenkaku'];
  }

  getProperty_(key: string): string {
    const value = PropertiesService.getScriptProperties().getProperty(key);
    if (!value) {
      throw new Error(key + ' is not set.');
    }
    return value;
  }

  getproperties(head: string): string[] {
    const propertyIdList = this.categoryCodes.map(
      categoryCode => `${head}${categoryCode}`
    );
    const properties = propertyIdList.map(propertyId =>
      this.getProperty_(propertyId)
    );
    return properties;
  }
}
