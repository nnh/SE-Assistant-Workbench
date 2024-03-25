const { Builder, By } = require("selenium-webdriver");
const assert = require("assert");

let driver;

describe("入力フォーム デモ", () => {
  // テスト開始前にドライバーを起動
  beforeAll(() => {
    driver = new Builder().forBrowser("chrome").build();
  });

  // テスト終了後にドライバーを終了
  afterAll(() => driver.quit());

  test("名前欄の必須入力チェック その1", async () => {
    // テスト対象のページへアクセス
    await driver.get("https://hotel.testplanisphere.dev/ja/login.html");

    // 何も入力せずにSubmitする
    await driver.findElement(By.id("login-button")).click();

    // エラーメッセージを取得して、エラー文言が正しいかチェックする
    const errorMessage = await driver
      .findElement(By.id("email-message"))
      .getText();
    assert.equal(errorMessage, "このフィールドを入力してください。");
  });
  test("aaaa", async () => {
    // テスト対象のページへアクセス
    await driver.get("https://hotel.testplanisphere.dev/ja/index.html");

    // 何も入力せずにSubmitする
    await driver
      .findElement(By.xpath("//a[@class='nav-link' and text()='宿泊予約']"))
      .click();

    // エラーメッセージを取得して、エラー文言が正しいかチェックする
    const currentUrl = await driver.getCurrentUrl();
    assert.equal(currentUrl, "https://hotel.testplanisphere.dev/ja/plans.html");
  });
  /*
  test("名前欄の必須入力チェック その2", async () => {
    // テスト対象のページへアクセス
    await driver.get(
      "https://ics-creative.github.io/180523_selenium_webdriver/"
    );

    // 名前を入力してSubmitする
    await driver.findElement(By.id("name")).sendKeys("品川太郎");
    await driver.findElement(By.id("submitButton")).click();

    // エラーメッセージを取得して、エラー文言が空であるかチェックする
    const errorMessage = await driver
      .findElement(By.id("error_name"))
      .getText();
    assert.equal(errorMessage, "");
  });
*/
});
