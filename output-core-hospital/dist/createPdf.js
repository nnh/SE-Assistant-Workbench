/**
 * 参考URL
 * https://officeforest.org/wp/2018/11/25/google-apps-script%E3%81%A7pdf%E3%82%92%E4%BD%9C%E6%88%90%E3%81%99%E3%82%8B/#%E3%82%BD%E3%83%BC%E3%82%B9%E3%82%B3%E3%83%BC%E3%83%89:~:text=%E3%82%8C%E3%81%B0OK%E3%80%82-,%E8%A4%87%E6%95%B0%E3%81%AEPDF%E3%82%92%E7%B5%90%E5%90%88%E3%81%99%E3%82%8B,-Cloud%20Functions%E3%82%92
 * Google Apps ScriptでPDFを操作する（PDF-LIB） #GoogleAppsScript - Qiita
 * https://qiita.com/takatama/items/ac3284cae34a2d72ed53
 * V8 Google Apps Scriptで複数のPDFを1つにまとめるスクリプト #JavaScript - Qiita
 * https://qiita.com/mat_aaa/items/d77320769b5ac837a98b
 * google apps script - Merge Multiple PDF's into one PDF - Stack Overflow
 * https://stackoverflow.com/questions/15414077/merge-multiple-pdfs-into-one-pdf
 */
eval(
  UrlFetchApp.fetch(
    'https://unpkg.com/pdf-lib/dist/pdf-lib.js'
  ).getContentText()
);
setTimeout = (func, sleep) => (Utilities.sleep(sleep), func());
/**
 * Returns merged pdf, blobs are merged in the same order they are proivded.
 * @param {Blob[]} blobs Blob array
 * @param {String} fileName output PDF name
 * @return {Promise} Promise object, blob of merged blobs
 */
async function mergeAllPDFs_(blobs, fileName) {
  const pdf = await PDFLib.PDFDocument.create();
  for (let i = 0; i < blobs.length; i++) {
    const tempBytes = await new Uint8Array(blobs[i].getBytes());
    const tempPdf = await PDFLib.PDFDocument.load(tempBytes);
    const pages = tempPdf.getPageCount();
    for (let p = 0; p < pages; p++) {
      const [tempPage] = await pdf.copyPages(tempPdf, [p]);
      pdf.addPage(tempPage);
    }
  }
  const pdfDoc = await pdf.save();
  return Utilities.newBlob(pdfDoc).setName(fileName);
}

async function mergeFiles_(targetFolderId) {
  const folder = DriveApp.getFolderById(targetFolderId);
  const files = folder.getFiles();
  const yoshiki = '様式';
  const betten = '別添';
  const sortOrder = new Map([
    [yoshiki, 100],
    [betten, 500],
  ]);
  const tempBlobs = new Map();
  while (files.hasNext()) {
    let file = files.next();
    console.log(file.getName());
    let tempIndex;
    let header;
    if (file.getMimeType() === 'application/pdf') {
      const fileName = file.getName();
      if (new RegExp(yoshiki).test(fileName)) {
        tempIndex = fileName.replace(yoshiki, '').replace(/\s.*pdf$/, '');
        header = yoshiki;
      } else if (new RegExp(betten).test(fileName)) {
        tempIndex = fileName.replace(betten, '').replace(/\s.*pdf$/, '');
        header = betten;
      } else {
        tempIndex = 'dummy';
        header = 'dummy';
      }
      let index;
      if (!isNaN(tempIndex)) {
        index = Number(tempIndex) + sortOrder.get(header);
        const blob = file.getBlob();
        tempBlobs.set(index, blob);
      }
    }
  }
  const blobs = sortMapByKey_(tempBlobs);
  const newPdfName = `臨床研究中核病院申請資料 ${getFormattedDate_()}.pdf`;
  const myPDF = await mergeAllPDFs_(blobs, newPdfName);
  folder.createFile(myPDF);
}
function sortMapByKey_(map) {
  const sortedEntries = [...map.entries()].sort((a, b) => {
    // キーを数値として比較してソート
    return a[0] - b[0];
  });

  // ソートされたエントリーの値の配列を作成
  const sortedValues = sortedEntries.map(entry => entry[1]);

  return sortedValues;
}

function createPdf_(targetId, fileName, outputFolderId) {
  const parameters = new Map([['portrait', 'false']]);
  const options = generateOptionsString_(parameters);
  const convertDocToPdf = new ConvertDocToPdf(outputFolderId);
  const mimeType = checkFileType_(targetId);
  if (mimeType === 'application/vnd.google-apps.document') {
    console.log(fileName);
    convertDocToPdf.createPdf(targetId, fileName, options);
  }
}
