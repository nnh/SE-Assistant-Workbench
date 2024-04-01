// defineTestLinkClickByPage.js
const {
  linkClickTestListIndex,
  targetUrlList,
  csvToArray,
} = require("./defineTestCommonInfo.js");
const replaceUrl = "https://crc.nnh.go.jp/";
const replaceUrl2 = "http://crc.nnh.go.jp/";
const replaceUrl3 = targetUrlList[0].replace("https://", "http://");
function getLinkList(filePath) {
  const nextDirReplaceList = [
    [
      new RegExp(
        `${targetUrlList[0]}departments/clinical_trial_services/`,
        "i"
      ),
      `${targetUrlList[0]}clinical_trial_services/`,
    ],
    [
      new RegExp(`${targetUrlList[0]}seminar/`, "i"),
      `${targetUrlList[0]}/departments/education_and_public_relations/seminar/`,
    ],
    [
      new RegExp(`${targetUrlList[0]}education_and_public_relations/`, "i"),
      `${targetUrlList[0]}departments/education_and_public_relations/`,
    ],
    [/^\/crc\/departments\//i, "/departments/"],
    [/^\/crc\/staff\//i, "/staff/"],
    [new RegExp("//departments"), "/departments"],
    [new RegExp("staff//"), "staff/"],
    [new RegExp("http://www.shikuken.jp/"), "https://www.shikuken.jp/"],
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
