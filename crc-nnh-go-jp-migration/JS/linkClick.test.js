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
    return false;
  }
  return true;
}

async function execLinkClickNewWindowTest(url, target) {
  // 現在のウィンドウハンドルを取得
  let currentWindowHandle;
  try {
    currentWindowHandle = await driver.wait(async () => {
      const currentWindowHandle = await driver.getWindowHandle();
      return currentWindowHandle;
    }, 10000);
  } catch (error) {
    assert.fail(`Failed to get current window handle:, ${url}`);
  }

  const nextUrl = target[linkClickTestListIndex.get("nextDir")];
  const flag = await clickElementByXpath(url, target);
  if (!flag && !detailClickUrl.test(url)) {
    assert.fail(`Error occurred while waiting for the URL:", ${url}`);
  }
  if (!flag && detailClickUrl.test(url)) {
    let element2;
    const targetLabel = target[linkClickTestListIndex.get("label")].trim();
    const r5check = [
      "令和5年04月06日分",
      "令和5年05月11日分",
      "令和5年07月06日分",
      "令和5年08月03日分",
      "令和5年09月07日分",
      "令和5年10月05日分",
      "令和5年12月07日分",
      "令和6年02月01日分",
      "令和6年03月07日分",
    ].includes(targetLabel);
    const r4check = [
      "令和4年04月07日分",
      "令和4年05月12日分",
      "令和4年06月02日分",
      "令和4年07月07日分",
      "令和4年08月04日分",
      "令和4年09月01日分",
      "令和4年10月18日分",
      "令和4年11月10日分",
      "令和5年01月05日分",
      "令和5年02月02日分",
      "令和5年03月02日分",
    ].includes(targetLabel);
    const r3check = [
      "令和3年04月22日分",
      "令和3年05月06日分",
      "令和3年06月03日分",
      "令和3年07月01日分",
      "令和3年08月05日分",
      "令和3年09月02日分",
      "令和3年10",
      "月07日分",
      "令和3年11月04日分",
      "令和3年11月19日分",
      "令和3年12月02日分",
      "令和4年02月10日分",
    ].includes(targetLabel);
    const r2check = [
      "令和2年05月07日分",
      "令和2年06月04日分",
      "令和2年07月02日分",
      "令和2年08月06日分",
      "令和2年09月03日分",
      "令和2年10月01日分",
      "令和2年11月05日分",
      "令和3年02月04日分",
      "令和3年03月04日分",
    ].includes(targetLabel);
    const r1check = [
      "令和元年04月04日分",
      "令和元年05月09日分",
      "令和元年06月06日分",
      "令和元年07月04日分",
      "令和元年10月03日分",
      "令和元年12月05日分",
      "令和2年01月09日分",
      "令和2年02月06日分",
      "令和2年03月05日分",
      "令和2年03月19日分",
    ].includes(targetLabel);
    const h30check = [
      "平成30年04月05日分",
      "平成30年05月10日分",
      "平成30年06月07日分",
      "平成30年07月09日分",
      "平成30年08月02日分",
      "平成30年09月06日分",
      "平成30年10月04日分",
      "平成30年11月01日分 ",
      "平成30年12月06日分",
      "平成31年01月10日分",
      "平成31年02月07日分",
      "平成31年03月07日分",
    ].includes(targetLabel);
    const h29check = [
      "平成29年04月06日分",
      "平成29年04月20日分",
      "平成29年05月18日分",
      "平成29年06月01日分",
      "平成29年06月15日分",
      "平成29年07月06日分",
      "平成29年07月20日分",
      "平成29年08月03日分",
      "平成29年09月07日分",
      "平成29年09月21日分",
      "平成29年10月05日分",
      "平成29年10月19日分",
      "平成29年11月02日分",
      "平成29年11月16日分",
      "平成29年12月21日分",
    ].includes(targetLabel);
    const h28check = [
      "平成28年04月07日分",
      "平成28年04月21日分",
      "平成28年05月19日分",
      "平成28年06月02日分",
      "平成28年06月16日分",
      "平成28年07月07日分",
      "平成28年07月21日分",
      "平成28年08月04日分",
      "平成28年09月01日分",
      "平成28年09月15日分",
      "平成28年10月06日分",
      "平成28年11月17日分",
      "平成28年12月01日分",
      "平成28年12月15日分",
      "平成29年01月19日分",
      "平成29年02月16日分",
      "平成29年03月02日分",
      "平成29年03月16日分",
    ].includes(targetLabel);
    const h27check = [
      "平成27年04月02日分",
      "平成27年04月16日分",
      "平成27年05月07日分",
      "平成27年05月21日分",
      "平成27年06月04日分",
      "平成27年06月18日分",
      "平成27年07月02日分",
      "平成27年07月16日分",
      "平成27年08月06日分",
      "平成27年09月03日分",
      "平成27年09月17日分",
      "平成27年10月15日分",
      "平成27年11月05日分",
      "平成27年11月19日分",
      "平成27年12月03日分",
      "平成27年12月17日分",
      "平成28年01月21日分",
      "平成28年02月04日分",
      "平成28年03月03日分",
      "平成28年03月17日分",
    ].includes(targetLabel);
    const h26check = [
      "平成26年04月分(第2)",
      "平成26年04月分",
      "平成26年05月分(第2)",
      "平成26年05月分",
      "平成26年06月分(第2)",
      "平成26年06月分",
      "平成26年07月分(第2)",
      "平成26年07月分",
      "平成26年08月分(第2)",
      "平成26年09月分(第2)",
      "平成26年09月分",
      "平成26年10月分(第2)",
      "平成26年10月分",
      "平成26年11月分(第2)",
      "平成26年11月分",
      "平成26年12月分",
      "平成27年01月分",
      "平成27年02月分(第2)",
      "平成27年02月分",
      "平成27年03月分(第2)",
      "平成27年03月分",
    ].includes(targetLabel);
    const h25check = [
      "平成25年04月分(第2)",
      "平成25年04月分",
      "平成25年05月分",
      "平成25年06月分(第2)",
      "平成25年06月分",
      "平成25年07月分(第2)",
      "平成25年07月分",
      "平成25年08月分(第2)",
      "平成25年09月分(第2)",
      "平成25年09月分",
      "平成25年10月分(第2)",
      "平成25年10月分",
      "平成25年11月分(第2)",
      "平成25年12月分(第2)",
      "平成25年12月分",
      "平成26年01月分",
      "平成26年02月分(第2)",
      "平成26年02月分",
      "平成26年03月分(第2)",
      "平成26年03月分",
    ].includes(targetLabel);
    const h24check = [
      "平成24年04月分",
      "平成24年05月分",
      "平成24年06月分",
      "平成24年07月分",
      "平成24年09月分",
      "平成24年10月分",
      "平成24年11月分(第2)",
      "平成24年11月分",
      "平成24年12月分(第2)",
      "平成24年12月分",
      "平成25年01月分",
      "平成25年03月分(第2)",
    ].includes(targetLabel);
    const h23check = [
      "平成23年04月分",
      "平成23年05月分",
      "平成23年06月分",
      "平成23年07月分",
      "平成23年09月分",
      "平成23年10月分",
      "平成23年11月分",
      "平成23年12月分",
      "平成24年01月分",
      "平成24年02月分",
      "平成24年03月分",
    ].includes(targetLabel);
    const h22check = [
      "平成22年04月分",
      "平成22年05月分",
      "平成22年06月分",
      "平成22年07月分",
      "平成22年09月分",
      "平成22年10月分",
      "平成22年11月分",
      "平成22年12月分",
      "平成23年01月分",
      "平成23年02月分",
      "平成23年03月分",
    ].includes(targetLabel);
    const h21check = [
      "平成21年04月分",
      "平成21年06月分",
      "平成21年07月分",
      "平成21年09月分",
      "平成21年10月分",
      "平成21年12月分",
      "平成22年01月分",
      "平成22年02月分",
    ].includes(targetLabel);
    if (r5check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[1]/summary/span')
      );
    } else if (r4check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[2]/summary/span')
      );
    } else if (r3check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[3]/summary/span')
      );
    } else if (r2check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[4]/summary/span')
      );
    } else if (r1check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[5]/summary/span')
      );
    } else if (h30check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[6]/summary/span')
      );
    } else if (h29check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[7]/summary/span')
      );
    } else if (h28check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[8]/summary/span')
      );
    } else if (h27check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[9]/summary/span')
      );
    } else if (h26check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[10]/summary/span')
      );
    } else if (h25check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[11]/summary/span')
      );
    } else if (h24check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[12]/summary/span')
      );
    } else if (h23check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[13]/summary/span')
      );
    } else if (h22check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[14]/summary/span')
      );
    } else if (h21check) {
      element2 = await driver.findElement(
        By.xpath('//*[@id="post-2994"]/div/details[15]/summary/span')
      );
    }
    try {
      await element2.click();
      await driver
        .findElement(
          By.xpath(target[linkClickTestListIndex.get("targetXpath")])
        )
        .findElement(By.xpath(target[linkClickTestListIndex.get("aXpath")]))
        .click();
    } catch (error) {
      assert.fail(`Error occurred while waiting for the URL:", ${url}`);
    }
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
  try {
    assert.equal(newWindowUrl, nextUrl);
  } catch (error) {
    const targetNewWindowUrl = newWindowUrl.replace(/\/$/, "");
    const targetUrl = nextUrl
      .replace(/http:/, "https:")
      .replace(new RegExp(testUrl), "")
      .replace(/\/$/, "");
    assert.equal(targetNewWindowUrl, targetUrl);
  }
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
          test.only(`${url}_${target[linkClickTestListIndex.get("nextDir")]}_${
            target[linkClickTestListIndex.get("label")]
          }`, async () => {
            await execLinkClickNewWindowTest(url, target);
          }, 30000); // タイムアウトを30秒に設定
          await new Promise((resolve) => setTimeout(resolve, 100));
        });
      }
      /*      targets.forEach(async (target) => {
        test(`${url}_${target[linkClickTestListIndex.get("nextDir")]}_${
          target[linkClickTestListIndex.get("label")]
        }`, async () => {
          await execLinkClickTest(url, target);
        }, 30000); // タイムアウトを30秒に設定
        await new Promise((resolve) => setTimeout(resolve, 100));
      });
      test(`${url}_ページトップに戻るリンクをクリックするとページのトップに戻る`, async () => {
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
      });*/
    });
  });
});
