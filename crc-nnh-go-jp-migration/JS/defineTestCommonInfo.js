// defineTestCommonInfo.js
const fs = require("fs");

const inputLinkListName = "./linkList - linkList.csv";
// ユーザー情報を取得する関数を定義
const getUserInfo = () => {
  const csvFilePath = "./user.csv";
  const data = fs.readFileSync(csvFilePath, "utf8").trim();
  const [username, password] = data.split(",");
  return { username, password };
};
function csvToArray(filePath) {
  const rowscsvData = fs.readFileSync(filePath, "utf-8");
  const csvDataArray = rowscsvData.trim().split("\n");
  const rows = csvDataArray.filter((_, idx) => idx !== 0);
  const dataArray = rows.map((row) => row.split(","));
  return dataArray;
}

const user = getUserInfo();
const topPageUrl = `http://${user.username}:${user.password}@crcnnh.a-and.net/`;
//const topPageUrl = `https://crc.nnh.go.jp/`;
const replaceUrl = "https://crc.nnh.go.jp/";
const replaceUrlMap = new Map([
  [replaceUrl, topPageUrl],
  [replaceUrl.replace(/^https/, "http"), topPageUrl],
]);
const linkClickTestListIndex = new Map([
  ["url", 0],
  ["targetXpath", 1],
  ["aXpath", 2],
  ["nextDir", 3],
  ["label", 4],
]);
const testUrl = `${user.username}:${user.password}@`;

function getTargetUrls(filePath) {
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

  const url = array.map((row) => {
    let replaceUrl = null;
    replaceUrlMap.forEach((value, key) => {
      if (new RegExp(key).test(row[linkClickTestListIndex.get("url")])) {
        replaceUrl = row[linkClickTestListIndex.get("url")].replace(
          new RegExp(key),
          value
        );
      }
    });
    return replaceUrl;
  });
  return [topPageUrl, ...Array.from(new Set(url))];
}

const targetUrlList = getTargetUrls(inputLinkListName);
const commonXpath = new Map([
  ["header", '//*[@id="masthead"]/div'],
  ["footer", '//*[@id="colophon"]'],
  ["bodyContents", '//*[@id="content"]'],
  ["headerEnglish", '//*[@id="masthead"]'],
]);

module.exports = {
  linkClickTestListIndex,
  targetUrlList,
  commonXpath,
  csvToArray,
  user,
  replaceUrl,
  inputLinkListName,
  testUrl,
}; // 関数をエクスポート
