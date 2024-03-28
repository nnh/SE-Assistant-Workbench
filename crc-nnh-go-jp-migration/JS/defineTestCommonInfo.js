// defineTestCommonInfo.js
const fs = require("fs");

// ユーザー情報を取得する関数を定義
const getUserInfo = () => {
  const csvFilePath = "./user.csv";
  const data = fs.readFileSync(csvFilePath, "utf8").trim();
  const [username, password] = data.split(",");
  return { username, password };
};

const user = getUserInfo();
const topPageUrl = `http://${user.username}:${user.password}@crcnnh.a-and.net/`;
const targetUrlList = [topPageUrl];
const linkClickTestListIndex = new Map([
  ["url", 0],
  ["targetXpath", 1],
  ["aXpath", 2],
  ["nextDir", 3],
  ["label", 4],
]);

module.exports = {
  linkClickTestListIndex,
  targetUrlList,
}; // 関数をエクスポート
