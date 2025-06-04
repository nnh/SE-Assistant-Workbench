function joinWosPubmed() {
  const sheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("join_wos_pubmed");
  const wosSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("wosData");
  const pubmedSheet =
    SpreadsheetApp.getActiveSpreadsheet().getSheetByName("pubmedData");
  if (!sheet || !wosSheet || !pubmedSheet) {
    throw new Error("シートが存在しません");
  }
  const wosData = wosSheet.getDataRange().getValues();
  const pubmedData = pubmedSheet.getDataRange().getValues();
  const wos_pmidIdx = 1;
  const pubmed_pmidIdx = 0;
  const wos_nameIdx = 2;
  const pubmed_nameIdx = 1;
  const result = [];
  const pubmedMap = new Map();
  pubmedData.forEach((row) => {
    const key = `${row[pubmed_pmidIdx]}_${row[pubmed_nameIdx]}`;
    pubmedMap.set(key, row);
  });

  // Perform the inner join using the composite key (wos_pmidIdx + wos_nameIdx)
  wosData.forEach((row) => {
    const key = `${row[wos_pmidIdx]}_${row[wos_nameIdx]}`;
    if (pubmedMap.has(key)) {
      const pubmedRow = pubmedMap.get(key);
      result.push([...row, ...pubmedRow]);
    }
  });
  // Write the result to the target sheet
  sheet.clear();
  const header = [
    [
      "wosId",
      "pubmedId",
      "wosName",
      "wosFacility",
      "pubmedName",
      "pubmedFacility",
      "wosUrl",
      "pubmedUrl",
    ],
  ];
  const outputValues = result.map((row) => [
    row[0],
    row[1],
    row[2],
    row[3],
    row[7],
    row[8],
    row[4],
    row[5],
  ]);
  sheet.getRange(1, 1, header.length, header[0].length).setValues(header);
  sheet
    .getRange(2, 1, outputValues.length, outputValues[0].length)
    .setValues(outputValues);
}
