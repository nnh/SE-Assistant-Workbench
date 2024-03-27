// form.test.js
const { Builder, By, WebElement } = require("selenium-webdriver");
const assert = require("assert");
const fs = require("fs");
const csvFilePath = "./user.csv";

let user = null;
function readUserFromCSV() {
  const data = fs.readFileSync(csvFilePath, "utf8").trim();
  const [username, password] = data.split(",");
  user = { username, password };

  console.log("ユーザー情報を読み込みました。");
  console.log(user); // ユーザー情報を出力する
}
readUserFromCSV();
let driver;
const topPageUrl = `http://${user.username}:${user.password}@crcnnh.a-and.net/about_us/`;
const targetUrlList = [topPageUrl];
const target = new Map([
  ["title", "トップページ"],
  ["url", "https://crc.nnh.go.jp/"],
]);

describe("リンククリックテスト", () => {
  // テスト開始前にドライバーを起動
  beforeAll(() => {
    driver = new Builder().forBrowser("chrome").build();
  });

  // テスト終了後にドライバーを終了
  afterAll(() => driver.quit());
  targetUrlList.forEach((url) => {
    test("aaaa", async () => {
      // テスト対象のページへアクセス
      await driver.get(url);

      // エラーメッセージを取得して、エラー文言が正しいかチェックする
      const currentUrl = await driver.getCurrentUrl();
      assert.equal(currentUrl, `${topPageUrl}`);
    }, 30000); // タイムアウトを30秒に設定
  });
});
