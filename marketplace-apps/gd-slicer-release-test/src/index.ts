import {
  compareTexts_,
  getTargetDocsMap_,
  getTargetDocsText_,
  targetList,
} from './compareDocs';
function main(): string {
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
      console.log(`info: ${fileName} - Different number of paragraphs`);
      // Remove blank lines and compare again; if the content matches, the test is passed.
      const isInternalTextsReduced: string[] = isInternalTexts.filter(
        text => text !== ''
      );
      const isPublicTextsReduced: string[] = isPublicTexts.filter(
        text => text !== ''
      );
      compareTexts_(isInternalTextsReduced, isPublicTextsReduced, fileName);
    } else {
      compareTexts_(isInternalTexts, isPublicTexts, fileName);
    }
  });
  return 'Test passed successfully';
}
const res = main();
console.log(res);
