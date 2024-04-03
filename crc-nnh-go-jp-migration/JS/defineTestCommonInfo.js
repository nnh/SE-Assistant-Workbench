// defineTestCommonInfo.js
const fs = require("fs");

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
//const topPageUrl = `http://${user.username}:${user.password}@crcnnh.a-and.net/`;
const topPageUrl = `https://crc.nnh.go.jp/`;
const pageMap = new Map([
  ["topPage", topPageUrl],
  ["aboutUs", `${topPageUrl}about_us/`],
]);
const targetUrlList = Array.from(pageMap.values());
const linkClickTestListIndex = new Map([
  ["url", 0],
  ["targetXpath", 1],
  ["aXpath", 2],
  ["nextDir", 3],
  ["label", 4],
]);
const commonXpath = new Map([
  ["header", '//*[@id="masthead"]/div'],
  ["footer", '//*[@id="colophon"]'],
  ["bodyContents", '//*[@id="content"]'],
]);

module.exports = {
  linkClickTestListIndex,
  targetUrlList,
  pageMap,
  commonXpath,
  csvToArray,
  user,
}; // 関数をエクスポート
