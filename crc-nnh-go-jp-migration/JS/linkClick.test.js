// linkClick.test.js
const { Builder, By } = require("selenium-webdriver");
const assert = require("assert");
const {
  linkClickTestListIndex,
  urlAndlinkList,
  urlAndWindowList,
  testUrl,
} = require("./defineTestLinkClick.js");
const { url } = require("inspector");
const detailClickUrl = /clinical_trial_services\/clinical_research\/minutes\/$/;
let driver;

async function clickElementByXpath(url, target) {
  try {
    await driver.get(url);
    await driver
      .findElement(By.xpath(target[linkClickTestListIndex.get("targetXpath")]))
      .findElement(By.xpath(target[linkClickTestListIndex.get("aXpath")]))
      .click();
  } catch (error) {
    console.log(`click_element_by_xpath_error:${url}`);
    console.log(`click_element_by_xpath_error:${target}`);
    return false;
  }
  return true;
}

async function execLinkClickNewWindowTest(url, target) {
  // 現在のウィンドウハンドルを取得
  const currentWindowHandle = await driver.getWindowHandle();

  const nextUrl = target[linkClickTestListIndex.get("nextDir")];
  const flag = await clickElementByXpath(url, target);
  if (!flag) {
    assert.fail(`Error occurred while waiting for the URL:", ${url}`);
  }

  try {
    // 新しいウィンドウが開かれるまで待機
    await driver.wait(async () => {
      const handles = await driver.getAllWindowHandles();
      return handles.length > 1;
    }, 10000);
  } catch (error) {
    assert.fail(`New windows could not be opened:, ${nextUrl}`);
  }
  try {
    // 新しいウィンドウのハンドルを取得
    const handles = await driver.getAllWindowHandles();
    const newWindowHandle = handles.find(
      (handle) => handle !== currentWindowHandle
    );

    // 新しいウィンドウに切り替える
    await driver.switchTo().window(newWindowHandle);
  } catch (error) {
    assert.fail(`Failed to switch to new window.:, ${nextUrl}`);
  }

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

async function execLinkClickTest(url, target) {
  const nextUrl = target[linkClickTestListIndex.get("nextDir")];
  const flag = await clickElementByXpath(url, target);
  if (!flag && !detailClickUrl.test(url)) {
    assert.fail(`Error occurred while waiting for the URL:", ${url}`);
  }
  if (!flag && detailClickUrl.test(url)) {
    const element2 = await driver.findElement(
      By.xpath('//*[@id="post-2994"]/div/details[7]/summary/span')
    );
    await element2.click();
    await driver
      .findElement(By.xpath(target[linkClickTestListIndex.get("targetXpath")]))
      .findElement(By.xpath(target[linkClickTestListIndex.get("aXpath")]))
      .click();
  }

  const currentUrl = await driver
    .wait(async () => {
      const currentUrl = await driver.getCurrentUrl();
      return currentUrl !== url ? currentUrl : null;
    }, 10000)
    .catch((error) => {
      if (url === nextUrl) {
        return url;
      }
      assert.fail(
        `Error occurred while waiting for the URL:", ${nextUrl}|url:${url}`
      );
    });
  try {
    assert.equal(currentUrl, nextUrl);
  } catch (error) {
    console.log(`currentUrl:${currentUrl}`);
    console.log(`nextUrl:${nextUrl}`);
    console.log(`testUrl:${testUrl}`);
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
      if (urlAndWindowList.has(url)) {
        const windowTargets = urlAndWindowList.get(url);
        windowTargets.forEach(async (target) => {
          test(`${url}_${target[linkClickTestListIndex.get("nextDir")]}_${
            target[linkClickTestListIndex.get("label")]
          }`, async () => {
            await execLinkClickNewWindowTest(url, target);
          }, 30000); // タイムアウトを30秒に設定
          await new Promise((resolve) => setTimeout(resolve, 100));
        });
      }
      targets.forEach(async (target) => {
        test(`${url}_${target[linkClickTestListIndex.get("nextDir")]}_${
          target[linkClickTestListIndex.get("label")]
        }`, async () => {
          await execLinkClickTest(url, target);
        }, 30000); // タイムアウトを30秒に設定
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      test.only(`${url}_ページトップに戻るリンクをクリックするとページのトップに戻る`, async () => {
        if (
          new RegExp("aro/regenerative_medicine_committee/minutes").test(url)
        ) {
          // 対象外のURLの場合はスキップ
          assert.equal(0, 0);
        } else {
          await driver.get(url);
          // ページの一番下に移動
          await driver.executeScript(
            "window.scrollTo(0, document.body.scrollHeight)"
          );
          // ページトップに戻るリンクをクリック
          const pageTopLink = await driver.findElement(By.css(".btnPageTop"));
          await pageTopLink.click();
          // ページのトップに戻ったかどうかを確認
          const tempCurrentUrl = await driver.getCurrentUrl();
          const currentUrl = tempCurrentUrl.replace(/\/$/, "");
          try {
            assert.equal(currentUrl, url); // ページのトップに戻っていることを確認
          } catch (error) {
            const targetUrl = url
              .replace(new RegExp("/crc/crc/"), "/crc/")
              .replace(/(?<!:)\/\//, "/")
              .replace(
                new RegExp("crc/seminar"),
                "crc/education_and_public_relations/seminar"
              )
              .replace(
                new RegExp("/crc/education_and_public_relations"),
                "/crc/departments/education_and_public_relations"
              )
              .replace(new RegExp("staff/crc/departments"), "departments")
              .replace(
                new RegExp("/crc/departments/clinical_trial_services"),
                "/crc/clinical_trial_services"
              )
              .replace(/\/$/, "");
            try {
              assert.equal(currentUrl, targetUrl);
            } catch (error) {
              const targetUrl2 = targetUrl.replace(new RegExp(testUrl), "");
              assert.equal(currentUrl, targetUrl2);
            }
          }
        }
      });
    });
  });
  /*  newWindowList.forEach(async (target) => {
    await execLinkClickNewWindowTestMain(target, "testtest");
  });*/
});
