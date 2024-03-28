// defineTestLinkClickByPage.js
const {
  linkClickTestListIndex,
  targetUrlList,
  csvToArray,
} = require("./defineTestCommonInfo.js");
const replaceUrl = "https://crc.nnh.go.jp/";
function getLinkList(filePath) {
  const linkListArray = csvToArray(filePath);
  const array = linkListArray
    .map((row) => {
      row.shift();
      return row;
    })
    .filter(
      (row) =>
        row[linkClickTestListIndex.get("aXpath")] !== "" && row.length > 0
    );
  const res = array.map((row) => {
    row[linkClickTestListIndex.get("url")] = row[
      linkClickTestListIndex.get("url")
    ].replace(replaceUrl, targetUrlList[0]);
    row[linkClickTestListIndex.get("targetXpath")] = row[
      linkClickTestListIndex.get("targetXpath")
    ]
      .replace(new RegExp('""', "g"), '"')
      .replace(/^"|"$/g, "");
    row[linkClickTestListIndex.get("aXpath")] = row[
      linkClickTestListIndex.get("aXpath")
    ]
      .replace(new RegExp('""', "g"), '"')
      .replace(/^"|"$/g, "");
    row[linkClickTestListIndex.get("nextDir")] = row[
      linkClickTestListIndex.get("nextDir")
    ].replace(replaceUrl, targetUrlList[0]);
    return row;
  });
  return res;
}
const linkList = getLinkList("./linkList - linkList.csv");
const newWindowList = getLinkList("./linkList - linkNewWindow.csv");
module.exports = {
  linkList,
  newWindowList,
};
