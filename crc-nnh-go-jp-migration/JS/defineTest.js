// defineTest.js
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
const commonXpath = new Map([
  ["header", '//*[@id="masthead"]/div'],
  ["footer", '//*[@id="colophon"]'],
]);
const targetUrlList = [topPageUrl];
const linkClickTestListIndex = new Map([
  ["url", 0],
  ["targetXpath", 1],
  ["aXpath", 2],
  ["nextDir", 3],
  ["label", 4],
]);
const headerMenuList = [
  [
    commonXpath.get("header"),
    '//*[@id="masthead"]/div/div[1]/h1/div[1]',
    "https://nagoya.hosp.go.jp/",
    "名古屋医療センターロゴ",
  ],
  [
    commonXpath.get("header"),
    '//*[@id="masthead"]/div/div[1]/h1/div[2]',
    topPageUrl,
    "臨床研究センター",
  ],
  [
    commonXpath.get("header"),
    '//*[@id="menu-item-14585"]/a',
    `${topPageUrl}about_us/`,
    "ご挨拶",
  ],
  [
    commonXpath.get("header"),
    '//*[@id="menu-item-14586"]/a',
    `${topPageUrl}departments/`,
    "部門",
  ],
  [
    commonXpath.get("header"),
    '//*[@id="menu-item-16255"]/a',
    `${topPageUrl}aro/`,
    "ARO",
  ],
  [
    commonXpath.get("header"),
    '//*[@id="menu-item-16154"]/a',
    `${topPageUrl}clinical_trial_services/`,
    "治験・臨床研究",
  ],
  [
    commonXpath.get("header"),
    '//*[@id="menu-item-14587"]/a',
    `${topPageUrl}staff/`,
    "スタッフ",
  ],
  [
    commonXpath.get("header"),
    '//*[@id="menu-item-721907"]/a',
    `${topPageUrl}accomplishments/`,
    "研究成果",
  ],
  [
    commonXpath.get("header"),
    '//*[@id="menu-item-14588"]/a',
    `${topPageUrl}public_information/`,
    "公開情報",
  ],
];
const linkClickTestHeaderMenu = targetUrlList
  .map((url) => {
    return headerMenuList.map((menu) => {
      return [url, ...menu];
    });
  })
  .flat();

module.exports = { linkClickTestListIndex, linkClickTestHeaderMenu }; // 関数をエクスポート
