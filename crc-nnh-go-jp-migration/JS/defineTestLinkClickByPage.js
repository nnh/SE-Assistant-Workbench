// defineTestLinkClickByPage.js
const {
  linkClickTestListIndex,
  targetUrlList,
  csvToArray,
  testUrl,
  replaceUrl,
  inputLinkListName,
  inputWindowListName,
} = require("./defineTestCommonInfo.js");
const excludeUrlList = [`${targetUrlList[0]}aro/edc/`];
const excludeXpathText = /EXCLUDED_ITEM/;

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
    [
      new RegExp("crc/departments#anc05"),
      `${targetUrlList[0]}departments/#anc05`,
    ],
    [
      /^\/crc\/departments\/clinical_trial_services\//,
      "/clinical_trial_services/",
    ],
    [/^\/crc\/departments\//i, "/departments/"],
    [/^\/crc\/staff\//i, "/staff/"],
    [new RegExp("//departments"), "/departments"],
    [new RegExp("staff//"), "staff/"],
    [
      new RegExp("https://doi.org/10.1016/j.jiac.2022.03.030"),
      "https://www.jiac-j.com/article/S1341-321X(22)00111-8/abstract",
    ],
    [
      new RegExp("https://doi.org/10.1002/jia2.26086"),
      "https://onlinelibrary.wiley.com/doi/10.1002/jia2.26086",
    ],
    [
      new RegExp(
        "https://advances.sciencemag.org/content/early/2020/09/18/sciadv.abd3916"
      ),
      "https://www.science.org/doi/10.1126/sciadv.abd3916",
    ],
    [
      new RegExp("http://crc.nnh.go.jp/wp-content/uploads/"),
      "https://crc.nnh.go.jp/wp-content/uploads/",
    ],
    [
      new RegExp(
        "https://us06web.zoom.us/meeting/register/tZUsceutrjorHdQGMp9SVfxNRGTzLLP-O62G"
      ),
      "https://us06web.zoom.us/meeting/register/tZUsceutrjorHdQGMp9SVfxNRGTzLLP-O62G#/registration",
    ],
    [
      new RegExp(
        "https://us06web.zoom.us/meeting/register/tZMpfu-rpz8uG9AvxDg5EXMrrYCpuMU12Il1"
      ),
      "https://us06web.zoom.us/meeting/register/tZMpfu-rpz8uG9AvxDg5EXMrrYCpuMU12Il1#/registration",
    ],
    [
      new RegExp("http://www.hiv-resistance.jp/"),
      "https://www.hiv-resistance.jp/",
    ],
    [new RegExp("http://acrf.jp"), "https://www.acrf.jp/"],
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
  const res = array
    .map((row) => {
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
        .replace(/^"|"$/g, "")
        .replace(/"\(/, "(")
        .replace(/\[2\]"$/, "[2]");
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
    })
    .filter(
      (row) =>
        !excludeUrlList.includes(row[linkClickTestListIndex.get("nextDir")])
    )
    .filter(
      (row) => !excludeXpathText.test(row[linkClickTestListIndex.get("aXpath")])
    )
    .filter(
      (row) => !excludeUrlList.includes(row[linkClickTestListIndex.get("url")])
    );
  return res;
}
const linkList = getLinkList(inputLinkListName);
const newWindowList = getLinkList(inputWindowListName);
module.exports = {
  linkList,
  newWindowList,
  testUrl,
};
