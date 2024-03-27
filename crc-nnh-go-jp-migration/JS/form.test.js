// form.test.js
const { Builder, By, WebElement } = require("selenium-webdriver");
const assert = require("assert");
const {
  linkClickTestListIndex,
  linkClickTestMenuMainMenu,
} = require("./defineTest.js");

let driver;

describe("リンククリックテスト", () => {
  // テスト開始前にドライバーを起動
  beforeAll(() => {
    driver = new Builder().forBrowser("chrome").build();
  });

  // テスト終了後にドライバーを終了
  afterAll(() => driver.quit());
  linkClickTestMenuMainMenu.forEach(async (target) => {
    const url = target[linkClickTestListIndex.get("url")];
    const targetXpath = target[linkClickTestListIndex.get("targetXpath")];
    const aXpath = target[linkClickTestListIndex.get("aXpath")];
    const nextDir = target[linkClickTestListIndex.get("nextDir")];
    const label = target[linkClickTestListIndex.get("label")];
    test(`${url}_${label}_${targetXpath}`, async () => {
      // テスト対象のページへアクセス
      await driver.get(url);
      await driver
        .findElement(By.xpath(targetXpath))
        .findElement(By.xpath(aXpath))
        .click();

      // エラーメッセージを取得して、エラー文言が正しいかチェックする
      const currentUrl = await driver.getCurrentUrl();
      assert.equal(currentUrl, `${url}${nextDir}`);
    }, 30000); // タイムアウトを30秒に設定
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
});
