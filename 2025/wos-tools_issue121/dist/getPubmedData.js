function writePubMedData() {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("pubmedData");
  if (!sheet) {
    return;
  }
  const outputValues = readAndProcessXML_();
  sheet.clear();
  const header = ["PubMed ID", "AuthorName", "Affiliation"];
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  sheet
    .getRange(2, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}
function readAndProcessXML_() {
  const folder = getFolder_();
  const files = folder.getFilesByName("pubmed_data.xml");
  if (files.hasNext()) {
    const file = files.next();
    const xmlContent = file.getBlob().getDataAsString();
    const document = XmlService.parse(xmlContent);
    const root = document.getRootElement();
    const pubmedArticles = root.getChildren("PubmedArticle"); // PubmedArticleを取得

    // 各PubmedArticleの処理
    const pubmedInfo = pubmedArticles
      .map((article) => {
        // PMIDの取得
        const pmidElement = article
          .getChild("MedlineCitation")
          .getChild("PMID");
        const pmid = pmidElement ? pmidElement.getText() : "No PMID";
        const authors = article
          .getChild("MedlineCitation")
          .getChild("Article")
          .getChild("AuthorList");
        const authorsInfo = authors
          .getChildren("Author")
          .map((author) => {
            const lastName = author.getChildText("LastName") || "";
            const firstName = author.getChildText("ForeName") || "";
            const name = `${lastName} ${firstName}`;
            if (author.getChild("AffiliationInfo") === null) {
              return null;
            }
            const affiliationInfos = author.getChildren("AffiliationInfo");
            const affiliations = affiliationInfos
              .map((affiliationInfo) => {
                const affiliation = affiliationInfo.getChild("Affiliation");
                return affiliation.getText();
              })
              .join(" | ");

            if (affiliations.length === 0) {
              return null;
            }
            return [name, affiliations];
          })
          .filter((authorInfo) => authorInfo !== null);
        if (authorsInfo.length === 0) {
          return null;
        }
        const res = authorsInfo.map((authorInfo) => {
          return [pmid, ...authorInfo];
        });
        return res;
      })
      .filter((pubmedInfo) => pubmedInfo !== null);
    const outputValues = pubmedInfo.flat();
    return outputValues;
  }
}
function fetchAndSavePubMedXMLToFolder() {
  const pubmedIdIdx = 1;
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("wosData");
  const tempValues = sheet
    .getRange(2, 1, sheet.getLastRow(), sheet.getLastColumn())
    .getValues();
  const pubMedIds = tempValues
    .map((row) => {
      const temp = row[pubmedIdIdx];
      if (/[0-9]{8}/.test(temp)) {
        return String(temp);
      }
      return null;
    })
    .filter((id) => id !== null);
  const uniquePubMedIds = [...new Set(pubMedIds)];
  fetchAndSavePubMedXMLToFolder_(uniquePubMedIds);
}
function fetchAndSavePubMedXMLToFolder_(pubMedIds) {
  const folder = getFolder_();
  const url =
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&retmode=xml&id=";
  const idString = pubMedIds.join(",");
  const fetchUrl = `${url}${idString}`;
  const response = UrlFetchApp.fetch(fetchUrl);
  const xmlContent = response.getContentText();
  const file = folder.createFile(
    "pubmed_data.xml",
    xmlContent,
    "application/xml"
  );
}
function checkString_(inputString) {
  // 文字列を小文字に変換してからチェック
  const lowerCaseString = inputString.toLowerCase();
  if (
    /National Hospital Organization/i.test(lowerCaseString) ||
    /NHO /i.test(lowerCaseString) ||
    /Natl Hosp Org/i.test(lowerCaseString)
  ) {
    return inputString; // 条件を満たす場合、その文字列を返す
  } else {
    return null;
  }
}
