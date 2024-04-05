// linkClick.test.js
const { Builder, By } = require("selenium-webdriver");
const assert = require("assert");
const {
  linkClickTestListIndex,
  urlAndlinkList,
  targetUrlList,
} = require("./defineTestLinkClick.js");
const { url } = require("inspector");
/*const {
  linkList,
  newWindowList,
  testUrl,
} = require("./defineTestLinkClickByPage.js");*/
const detailClickUrl = /clinical_trial_services\/clinical_research\/minutes\/$/;
const linkClickTestFlag = new Map([
  ["byPage", 0],
  ["pageCommon", 1],
]);
let driver;

async function execLinkClickNewWindowTest(target) {
  // 現在のウィンドウハンドルを取得
  const currentWindowHandle = await driver.getWindowHandle();

  const url = target[linkClickTestListIndex.get("url")];
  const targetXpath = target[linkClickTestListIndex.get("targetXpath")];
  const nextUrl = target[linkClickTestListIndex.get("nextDir")];

  // テスト対象のページへアクセス
  await driver.get(url);

  // リンクをクリック
  await driver
    .findElement(By.xpath(targetXpath))
    .findElement(By.xpath(target[linkClickTestListIndex.get("aXpath")]))
    .click();

  // 新しいウィンドウが開かれるまで待機
  await driver.wait(async () => {
    const handles = await driver.getAllWindowHandles();
    return handles.length > 1;
  }, 1000);

  // 新しいウィンドウのハンドルを取得
  const handles = await driver.getAllWindowHandles();
  const newWindowHandle = handles.find(
    (handle) => handle !== currentWindowHandle
  );

  // 新しいウィンドウに切り替える
  await driver.switchTo().window(newWindowHandle);

  // 新しいウィンドウのURLを取得
  const newWindowUrl = await driver.getCurrentUrl();

  // 新しいウィンドウを閉じる
  await driver.close();
  // 新しいウィンドウが閉じられるまで待つ
  await driver.wait(async () => {
    const handles = await driver.getAllWindowHandles();
    return handles.length === 1; // 新しいウィンドウが閉じた後はハンドルが1つになる
  }, 10000); // 例: 10秒間待機
  // 元のウィンドウに戻る
  await driver.switchTo().window(currentWindowHandle);
  // 元のウィンドウに戻るのを待つ
  await driver.wait(async () => {
    const currentHandle = await driver.getWindowHandle();
    return currentHandle === currentWindowHandle;
  }, 10000); // 例: 10秒間待機

  // アサーション: 新しいウィンドウのURLが期待されるURLと一致することを確認
  assert.equal(newWindowUrl, nextUrl);
}

async function execLinkClickNewWindowTestMain(target, testStringHead) {
  const testString = editTestString(testStringHead, target);
  test(
    testString,
    async () => {
      await execLinkClickNewWindowTest(target);
    },
    30000
  ); // タイムアウトを30秒に設定
  await new Promise((resolve) => setTimeout(resolve, 1000));
}

async function execLinkClickTest(url, target) {
  try {
    await driver.get(url);
  } catch (error) {
    assert.fail(`Error occurred while waiting for the URL:", ${url}`);
  }
  const targetXpath = target[linkClickTestListIndex.get("targetXpath")];
  const nextUrl = target[linkClickTestListIndex.get("nextDir")];
  if (detailClickUrl.test(url)) {
    const element = await driver.findElement(
      By.xpath('//*[@id="post-2994"]/div/details[7]/summary/span')
    );
    // 要素が見つかったらクリックします
    await element.click();
  }
  await driver
    .findElement(By.xpath(targetXpath))
    .findElement(By.xpath(target[linkClickTestListIndex.get("aXpath")]))
    .click();

  const currentUrl = await driver
    .wait(async () => {
      const currentUrl = await driver.getCurrentUrl();
      return currentUrl !== url ? currentUrl : null;
    }, 10000)
    .catch((error) => {
      if (url === nextUrl) {
        return url;
      }
      assert.fail(`Error occurred while waiting for the URL:", ${nextUrl}`);
    });
  try {
    assert.equal(currentUrl, nextUrl);
  } catch (error) {
    assert.equal(currentUrl, nextUrl.replace(new RegExp(testUrl), ""));
  }
}

describe("リンククリックテスト", () => {
  // テスト開始前にドライバーを起動
  beforeAll(() => {
    driver = new Builder().forBrowser("chrome").build();
  });
  // テスト終了後にドライバーを終了
  afterAll(() => driver.quit());
  describe("test", () => {
    urlAndlinkList.forEach(async (targets, url) => {
      targets.forEach(async (target) => {
        test(`${url}`, async () => {
          await execLinkClickTest(url, target);
        }, 30000); // タイムアウトを30秒に設定
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
    });
  });
  /*  newWindowList.forEach(async (target) => {
    await execLinkClickNewWindowTestMain(target, "testtest");
  });*/
  /*linkList.forEach(async (target) => {
    await execLinkClickTestMain(target, "ページ毎：", linkClickTestFlag.get("byPage"));
  });*/
  //urlAndlinkList.forEach(async (target, url) => {
  //  await execLinkClickTestMain(url, target, driver);
  //});
  /*  linkClickTestHeaderFooterMenu.forEach(async (target) => {
    await execLinkClickTestMain(
      target,
      "ページ共通headerFooter",
      linkClickTestFlag.get("pageCommon")
    );
  });*/
  /*  targetUrlList.forEach(async (url) => {
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
  });*/
});
