// form.test.js
const { Builder, By, WebElement } = require("selenium-webdriver");
const assert = require("assert");
const { getUserInfo } = require("./defineTest.js");

const user = getUserInfo();
let driver;
const topPageUrl = `http://${user.username}:${user.password}@crcnnh.a-and.net/`;
const targetUrlList = [[topPageUrl, '//*[@id="menu-main_menu"]']];
const linkClickTestListIndex = new Map([
  ["url", 0],
  ["targetXpath", 1],
  ["aXpath", 2],
  ["nextDir", 3],
  ["label", 4],
]);
const menuMainMenuList = [
  ['//*[@id="menu-item-14585"]/a', "about_us/", "ご挨拶"],
  ['//*[@id="menu-item-14586"]/a', "departments/", "部門"],
  ['//*[@id="menu-item-16255"]/a', "aro/", "ARO"],
  [
    '//*[@id="menu-item-16154"]/a',
    "clinical_trial_services/",
    "治験・臨床研究",
  ],
  ['//*[@id="menu-item-14587"]/a', "staff/", "スタッフ"],
  ['//*[@id="menu-item-721907"]/a', "accomplishments/", "研究成果"],
  ['//*[@id="menu-item-14588"]/a', "public_information/", "公開情報"],
];
const linkClickTestMenuMainMenu = targetUrlList
  .map((target) => {
    return menuMainMenuList.map((menu) => {
      return [...target, ...menu];
    });
  })
  .flat();
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
