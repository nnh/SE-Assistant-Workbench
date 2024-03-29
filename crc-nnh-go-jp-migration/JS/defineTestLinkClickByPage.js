// defineTestLinkClickByPage.js
const {
  linkClickTestListIndex,
  targetUrlList,
  csvToArray,
} = require("./defineTestCommonInfo.js");
const replaceUrl = "https://crc.nnh.go.jp/";
function getLinkList(filePath) {
  const nextDirReplaceList = [
    [
      new RegExp(`${targetUrlList[0]}education_and_public_relations/`, "i"),
      `${targetUrlList[0]}departments/education_and_public_relations/`,
    ],
    [/^\/crc\/staff\//i, "/staff/"],
  ];
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
    for (let i = 0; i < nextDirReplaceList.length; i++) {
      const [beforeText, afterText] = nextDirReplaceList[i];
      if (beforeText.test(row[linkClickTestListIndex.get("nextDir")])) {
        row[linkClickTestListIndex.get("nextDir")] = row[
          linkClickTestListIndex.get("nextDir")
        ].replace(beforeText, afterText);
        break;
      }
    }
    if (/^\//.test(row[linkClickTestListIndex.get("nextDir")])) {
      row[linkClickTestListIndex.get("nextDir")] = `${targetUrlList[0]}${row[
        linkClickTestListIndex.get("nextDir")
      ].replace(/^\//, "")}`;
    }
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
