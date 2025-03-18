// "機構のあゆみ（沿革） - 国立病院機構
// https://nho.hosp.go.jp/about/cnt1-0_000005.html"
function getSavedHtml_() {
  const folderId =
    PropertiesService.getScriptProperties().getProperty("folderId");
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFilesByName("hospital_names.html");
  if (!files.hasNext()) {
    return null;
  }
  const file = files.next();
  return file.getBlob().getDataAsString("UTF-8");
}

function main() {
  const html = getSavedHtml_();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("施設名");
  //  sheet.clear();
  const hospitalNames = fetchHospitalNames_(html);
  const outputValues = hospitalNames.map((name) => [name]);
  sheet.getRange(2, 1, outputValues.length, 1).setValues(outputValues);
}

function fetchHospitalNames_(html) {
  const tableRegex = /<table[^>]*>([\s\S]*?)<\/table>/g;
  const tables = [...html.matchAll(tableRegex)];
  const targetTable = tables[1][0];
  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  const trs = [...targetTable.matchAll(trRegex)];
  const tds = trs
    .map((tr) => {
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/g;
      const tds = [...tr[0].matchAll(tdRegex)];
      return tds;
    })
    .flat();
  // aタグを取得
  const aRegex = /<a[^>]*>([\s\S]*?)<\/a>/g;
  const hospitalNames = tds
    .map((td) => {
      const a = td[0].match(aRegex);
      // テキストだけ取得
      if (!a) {
        return null;
      }
      const text = a[0].replace(/<("[^"]*"|'[^']*'|[^'">])*>/g, "");
      return text;
    })
    .filter((name) => name !== null);
  return hospitalNames;
}
