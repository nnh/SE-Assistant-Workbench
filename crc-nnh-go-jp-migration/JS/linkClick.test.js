// linkClick.test.js
const { Builder, By } = require("selenium-webdriver");
const assert = require("assert");
const {
  linkClickTestListIndex,
  linkClickTestHeaderFooterMenu,
  targetUrlList,
} = require("./defineTestLinkClick.js");

let driver;
async function execLinkClickTest(target) {
  const url = target[linkClickTestListIndex.get("url")];
  const targetXpath = target[linkClickTestListIndex.get("targetXpath")];
  const nextUrl = target[linkClickTestListIndex.get("nextDir")];
  // テスト対象のページへアクセス
  await driver.get(url);
  await driver
    .findElement(By.xpath(targetXpath))
    .findElement(By.xpath(target[linkClickTestListIndex.get("aXpath")]))
    .click();

  // エラーメッセージを取得して、エラー文言が正しいかチェックする
  const currentUrl = await driver.getCurrentUrl();
  assert.equal(currentUrl, nextUrl);
}
function editTestString(text, target) {
  const url = target[linkClickTestListIndex.get("url")];
  const targetXpath = target[linkClickTestListIndex.get("targetXpath")];
  const label = target[linkClickTestListIndex.get("label")];
  return `${text}_${url}_${targetXpath}_${label}`;
}

describe("リンククリックテスト", () => {
  // テスト開始前にドライバーを起動
  beforeAll(() => {
    driver = new Builder().forBrowser("chrome").build();
  });

  // テスト終了後にドライバーを終了
  afterAll(() => driver.quit());
  linkClickTestHeaderFooterMenu.forEach(async (target) => {
    const testString = editTestString("ページ共通headerFooter", target);
    test(
      testString,
      async () => {
        await execLinkClickTest(target);
      },
      30000
    ); // タイムアウトを30秒に設定
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });
  targetUrlList.forEach(async (url) => {
    test("ページトップに戻るリンクをクリックするとページのトップに戻る", async () => {
      // テスト対象のURLを指定
      await driver.get(url);

      // ページの一番下に移動
      await driver.executeScript(
        "window.scrollTo(0, document.body.scrollHeight)"
      );

      // ページトップに戻るリンクをクリック
      const pageTopLink = await driver.findElement(By.css(".btnPageTop"));
      await pageTopLink.click();

      // ページのトップに戻ったかどうかを確認
      const currentUrl = await driver.getCurrentUrl();
      assert.equal(currentUrl, url); // ページのトップに戻っていることを確認
    });
  });
});
