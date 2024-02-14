/**
 * The PDF of the graph input source is retrieved from the specified URL.
 * @param none.
 * @return none.
 */
function getPdfFilesMain() {
  const getPdfArg = new Map();
  getPdfArg.set(
    'savePdfFolderId',
    PropertiesService.getScriptProperties().getProperty('savePdfFolderId')
  );
  const getPdfParentUrl =
    'https://www.mhlw.go.jp/stf/seisakunitsuite/bunya/0000165585.html';
  getPdfArg.set('fqdn', 'https://www.mhlw.go.jp');
  const getPdf = new GetPdf(getPdfArg);
  const parentContents = getPdf.getParent(getPdfParentUrl);
  const urlAndFilenames = getPdf.getPdfUrls(parentContents);
  urlAndFilenames.forEach(([url, filename]) => {
    getPdf.getPdf(url, filename);
  });
}
class GetPdf {
  constructor(getPdfArg) {
    this.moveToFolderId = getPdfArg.get('savePdfFolderId');
    this.fqdn = getPdfArg.get('fqdn');
  }
  getPdf(targetUrl, filename) {
    const pdf = UrlFetchApp.fetch(targetUrl).getAs('application/pdf');
    const folder = DriveApp.getFolderById(this.moveToFolderId);
    const createPdf = DriveApp.createFile(pdf);
    createPdf.moveTo(folder);
    createPdf.setName(filename);
    Utilities.sleep(20);
  }
  getParent(targetUrl) {
    const res = UrlFetchApp.fetch(targetUrl);
    const resContents = res.getContentText();
    return resContents;
  }
  getPdfUrls(targetContents) {
    const target1 = targetContents.split('<div class="heading-lv2">');
    const urlAndFilenames = target1
      .map(target => {
        const tempYearText = target.match(new RegExp('<h2>.+</h2>'));
        if (tempYearText === null) {
          return;
        }
        const yearText = tempYearText[0]
          .replace('<h2>', '')
          .replace('</h2>', '');
        const tempValues = target.match(new RegExp('<p>.+</p>', 's'));
        if (tempValues === null) {
          return;
        }
        const tempContents = tempValues[0].match(
          /\/content\/[0-9/]*\.pdf">(.*?)<\/a>/g
        );
        if (tempContents === null) {
          return;
        }
        const urlAndFilename = tempContents.map(contents => {
          const temp = contents.split('（');
          if (temp === null) {
            return [null, null];
          }
          const url = temp[0].match(/\/content\/[0-9/]*\.pdf/);
          const hospName = temp[0].split('>');
          if (url === null || hospName === null) {
            return [null, null];
          }
          return [
            `${this.fqdn}${url[0]}`,
            `${hospName[1].replace('・', '')}_${yearText}`,
          ];
        });
        return urlAndFilename;
      })
      .filter(x => x !== undefined)
      .flat();

    return urlAndFilenames;
  }
}
