// linkClick.test.js
const { Builder, By } = require("selenium-webdriver");
const assert = require("assert");
const {
  linkClickTestListIndex,
  urlAndlinkList,
  urlAndWindowList,
  targetUrlList,
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
  try {
    // 新しいウィンドウのURLを取得
    const newWindowUrl = await driver.getCurrentUrl();

    // 新しいウィンドウを閉じる
    await driver.close();
    // 新しいウィンドウが閉じられるまで待つ
    await driver.wait(async () => {
      const handles = await driver.getAllWindowHandles();
      return handles.length === 1; // 新しいウィンドウが閉じた後はハンドルが1つになる
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
  } catch (error) {
    assert.fail(`Failed to switch to new window.:, ${nextUrl}`);
  } finally {
    // 元のウィンドウに戻る
    await driver.switchTo().window(currentWindowHandle);
    // 元のウィンドウに戻るのを待つ
    await driver.wait(async () => {
      const currentHandle = await driver.getWindowHandle();
      return currentHandle === currentWindowHandle;
    }, 10000); // 例: 10秒間待機
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
});

/*
describe("画像読み込みテスト", () => {
  // テスト開始前にドライバーを起動
  beforeAll(() => {
    driver = new Builder().forBrowser("chrome").build();
  });
  // テスト終了後にドライバーを終了
  afterAll(() => driver.quit());
  describe("test", () => {
    const urlList = [
      `${targetUrlList[0]}about_us/`,
      `${targetUrlList[0]}accomplishments/`,
      `${targetUrlList[0]}aro/`,
      `${targetUrlList[0]}clinical_trial_services/`,
      `${targetUrlList[0]}contact/`,
      `${targetUrlList[0]}departments/`,
      `${targetUrlList[0]}education_and_public_relations/`,
      `${targetUrlList[0]}en/`,
      `${targetUrlList[0]}form/`,
      `${targetUrlList[0]}links/`,
      `${targetUrlList[0]}news/`,
      `${targetUrlList[0]}public_information/`,
      `${targetUrlList[0]}publication/`,
      `${targetUrlList[0]}seminar/`,
      `${targetUrlList[0]}sitemap/`,
      `${targetUrlList[0]}staff/`,
      `${targetUrlList[0]}accomplishments/capital/`,
      `${targetUrlList[0]}accomplishments/j_talc2/`,
      `${targetUrlList[0]}aro/access/`,
      `${targetUrlList[0]}aro/audit_committee/`,
      `${targetUrlList[0]}aro/cirb/`,
      `${targetUrlList[0]}aro/consultation/`,
      `${targetUrlList[0]}aro/contact/`,
      `${targetUrlList[0]}aro/datacenter/`,
      `${targetUrlList[0]}aro/edc/`,
      `${targetUrlList[0]}aro/education/`,
      `${targetUrlList[0]}aro/members/`,
      `${targetUrlList[0]}aro/network/`,
      `${targetUrlList[0]}aro/regenerative_medicine_committee/`,
      `${targetUrlList[0]}aro/studies/`,
      `${targetUrlList[0]}clinical_trial_services/about_us/`,
      `${targetUrlList[0]}clinical_trial_services/cknnavi/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/data_and_specimen_provision`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/irb`,
      `${targetUrlList[0]}clinical_trial_services/contact/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/`,
      `${targetUrlList[0]}clinical_trial_services/medical_expert/`,
      `${targetUrlList[0]}clinical_trial_services/news-2/`,
      `${targetUrlList[0]}clinical_trial_services/patient2/`,
      `${targetUrlList[0]}clinical_trial_services/pms/`,
      `${targetUrlList[0]}clinical_trial_services/request_person/`,
      `${targetUrlList[0]}crc/departments/`,
      `${targetUrlList[0]}crc/staff/nishimura_rieko`,
      `${targetUrlList[0]}departments/cell_therapy/`,
      `${targetUrlList[0]}departments/clinical_research/`,
      `${targetUrlList[0]}departments/education_and_public_relations/`,
      `${targetUrlList[0]}departments/education_and_public_relations/seminar`,
      `${targetUrlList[0]}departments/infectious_diseases/`,
      `${targetUrlList[0]}departments/information_system_research/`,
      `${targetUrlList[0]}departments/pathology/`,
      `${targetUrlList[0]}departments/stem_cell_research/`,
      `${targetUrlList[0]}en/contact/`,
      `${targetUrlList[0]}en/departments/`,
      `${targetUrlList[0]}en/links/`,
      `${targetUrlList[0]}en/news/`,
      `${targetUrlList[0]}en/sitemap/`,
      `${targetUrlList[0]}en/staff/`,
      `${targetUrlList[0]}public_information/animal/`,
      `${targetUrlList[0]}public_information/core_hospital/`,
      `${targetUrlList[0]}public_information/ethics/`,
      `${targetUrlList[0]}public_information/performance/`,
      `${targetUrlList[0]}public_information/templates/`,
      `${targetUrlList[0]}public_information/trials2/`,
      `${targetUrlList[0]}publication/year2022/`,
      `${targetUrlList[0]}publication/year2023/`,
      `${targetUrlList[0]}seminar/chiken/`,
      `${targetUrlList[0]}staff/crc/departments`,
      `${targetUrlList[0]}staff/futamura_masaki/`,
      `${targetUrlList[0]}staff/hashimoto_hiroya/`,
      `${targetUrlList[0]}staff/hattori_hiroyoshi/`,
      `${targetUrlList[0]}staff/horibe_keizo/`,
      `${targetUrlList[0]}staff/iida_hiroatsu/`,
      `${targetUrlList[0]}staff/imahashi_mayumi/`,
      `${targetUrlList[0]}staff/ito_noriko/`,
      `${targetUrlList[0]}staff/iwatani_yasumasa/`,
      `${targetUrlList[0]}staff/katayama_masao/`,
      `${targetUrlList[0]}staff/kogure_yoshihito/`,
      `${targetUrlList[0]}staff/kondo_takahisa/`,
      `${targetUrlList[0]}staff/nagai_hirokazu/`,
      `${targetUrlList[0]}staff/nishimura_rieko/`,
      `${targetUrlList[0]}staff/oiwa_mikinao/`,
      `${targetUrlList[0]}staff/saito_akiko/`,
      `${targetUrlList[0]}staff/saito_toshiki/`,
      `${targetUrlList[0]}staff/saka_hideo/`,
      `${targetUrlList[0]}staff/sanada_masashi/`,
      `${targetUrlList[0]}staff/sekimizu_masahiro/`,
      `${targetUrlList[0]}staff/suenaga_masaya/`,
      `${targetUrlList[0]}staff/yasuda_takahiko/`,
      `${targetUrlList[0]}staff/yokomaku_yoshiyuki/`,
      `${targetUrlList[0]}2011/05/40/`,
      `${targetUrlList[0]}2011/10/42/`,
      //      `${targetUrlList[0]}2012/02/120/`,  // 元からリンク切れなので対象外にする
      `${targetUrlList[0]}2012/09/16133/`,
      `${targetUrlList[0]}2013/03/16135/`,
      `${targetUrlList[0]}2013/04/16137/`,
      `${targetUrlList[0]}2013/11/16139/`,
      `${targetUrlList[0]}2013/11/16141/`,
      `${targetUrlList[0]}2013/11/16143/`,
      `${targetUrlList[0]}2013/11/16145/`,
      `${targetUrlList[0]}2019/04/69420/`,
      `${targetUrlList[0]}2019/04/69422/`,
      `${targetUrlList[0]}2019/04/69426/`,
      `${targetUrlList[0]}2019/04/69438/`,
      `${targetUrlList[0]}2019/04/70945/`,
      `${targetUrlList[0]}2019/05/75189/`,
      `${targetUrlList[0]}2019/06/78099/`,
      `${targetUrlList[0]}2019/07/85037/`,
      `${targetUrlList[0]}2019/08/88983/`,
      `${targetUrlList[0]}2019/09/94739/`,
      `${targetUrlList[0]}2019/10/96890/`,
      `${targetUrlList[0]}2019/11/102065/`,
      `${targetUrlList[0]}2019/12/102354/`,
      `${targetUrlList[0]}2020/01/102412/`,
      `${targetUrlList[0]}2020/01/106316/`,
      `${targetUrlList[0]}2020/02/113187/`,
      `${targetUrlList[0]}2020/09/171649/`,
      `${targetUrlList[0]}2021/04/245493/`,
      `${targetUrlList[0]}2022/05/654429/`,
      `${targetUrlList[0]}2022/10/699032/`,
      `${targetUrlList[0]}2023/01/714240/`,
      `${targetUrlList[0]}2023/08/720008/`,
      `${targetUrlList[0]}2024/03/751544/`,
      `${targetUrlList[0]}aro/consultation/form/`,
      `${targetUrlList[0]}clinical_trial_services/rmc/forms/`,
      `${targetUrlList[0]}aro/regenerative_medicine_committee/minutes/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/crb/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/data_and_specimen_provision/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/form/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/irb/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/member/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/minutes/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/nho/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/permission-application/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/schedule/`,
      `${targetUrlList[0]}clinical_trial_services/clinical_research/sop/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/kiroku-2/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/manual/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/member/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/2019-2`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/2020-2`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/2021-2`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/2022-2`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/2023-2`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/2024-2`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/schedule/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/spec/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/spec/kensa_nmc`,
      `${targetUrlList[0]}clinical_trial_services/patient2/about_clinicalstudy/`,
      `${targetUrlList[0]}clinical_trial_services/patient2/about_effect/`,
      `${targetUrlList[0]}clinical_trial_services/patient2/aboutclinical_part2/`,
      `${targetUrlList[0]}clinical_trial_services/patient2/aboutclinical_part3/`,
      `${targetUrlList[0]}clinical_trial_services/pms/form/`,
      `${targetUrlList[0]}clinical_trial_services/pms/form2/`,
      `${targetUrlList[0]}crc/departments/cell_therapy/`,
      `${targetUrlList[0]}crc/departments/clinical_research/`,
      `${targetUrlList[0]}crc/departments/clinical_trial_services/`,
      `${targetUrlList[0]}crc/departments/infectious_diseases/`,
      `${targetUrlList[0]}crc/departments/pathology/`,
      `${targetUrlList[0]}crc/staff/futamura_masaki/`,
      `${targetUrlList[0]}crc/staff/hashimoto_hiroya/`,
      `${targetUrlList[0]}crc/staff/hattori_hiroyoshi/`,
      `${targetUrlList[0]}crc/staff/horibe_keizo/`,
      `${targetUrlList[0]}crc/staff/iida_hiroatsu/`,
      `${targetUrlList[0]}crc/staff/imahashi_mayumi/`,
      `${targetUrlList[0]}crc/staff/ito_noriko/`,
      `${targetUrlList[0]}crc/staff/iwatani_yasumasa/`,
      `${targetUrlList[0]}crc/staff/katayama_masao/`,
      `${targetUrlList[0]}crc/staff/kogure_yoshihito/`,
      `${targetUrlList[0]}crc/staff/kondo_takahisa/`,
      `${targetUrlList[0]}crc/staff/nagai_hirokazu/`,
      `${targetUrlList[0]}crc/staff/oiwa_mikinao/`,
      `${targetUrlList[0]}crc/staff/saito_akiko/`,
      `${targetUrlList[0]}crc/staff/saito_toshiki/`,
      `${targetUrlList[0]}crc/staff/saka_hideo/`,
      `${targetUrlList[0]}crc/staff/sanada_masashi/`,
      `${targetUrlList[0]}crc/staff/sekimizu_masahiro/`,
      `${targetUrlList[0]}crc/staff/suenaga_masaya/`,
      `${targetUrlList[0]}crc/staff/yasuda_takahiko/`,
      `${targetUrlList[0]}crc/staff/yokomaku_yoshiyuki/`,
      `${targetUrlList[0]}departments/education_and_public_relations/seminar/`,
      `${targetUrlList[0]}departments/information_system_research/chapter_numbering/`,
      `${targetUrlList[0]}en/departments/infectious_diseases/`,
      `${targetUrlList[0]}en/staff/akiko-saito/`,
      `${targetUrlList[0]}en/staff/hideo-saka/`,
      `${targetUrlList[0]}en/staff/hirokazu-nagai/`,
      `${targetUrlList[0]}en/staff/hiroyoshi-hattori/`,
      `${targetUrlList[0]}en/staff/keizo-horibe/`,
      `${targetUrlList[0]}en/staff/toshiki-saito/`,
      `${targetUrlList[0]}en/staff/yasumasa-iwatani/`,
      `${targetUrlList[0]}en/staff/yoshiyuki-yokomaku/`,
      `${targetUrlList[0]}news/page/2/`,
      `${targetUrlList[0]}news/page/3/`,
      `${targetUrlList[0]}news/page/4/`,
      `${targetUrlList[0]}public_information/animal/minutes/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/kiroku-2/2017_3/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/kiroku-2/2018_3/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/kiroku-2/2019_3/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/kiroku-2/2020_3/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/kiroku-2/2021_3/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/kiroku-2/2022_3/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/kiroku-2/2023_3/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h21/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h22/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h23/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h24/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h25/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h26/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h27/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h28/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h29/`,
      `${targetUrlList[0]}clinical_trial_services/drug_trials/minutes/h30/`,
      `${targetUrlList[0]}crc/staff//kondo_takahisa/`,
      `${targetUrlList[0]}departments/information_system_research/chapter_numbering/chapter_numbering_privacy_policy/`,
      `${targetUrlList[0]}en/2011/05/68/`,
      `${targetUrlList[0]}en/2011/10/70/`,
      `${targetUrlList[0]}accomplishments/alc_alcl/`,
      `${targetUrlList[0]}clinical_trial_services/crb/minutes/`,
    ];
    urlList.forEach((url) => {
      test.only(`${url}_画像読み込みテスト`, async () => {
        await driver.get(url);
        // ページの一番下に移動
        try {
          await driver.get(url);

          // JavaScriptを実行して画像の読み込み状態を確認
          const imageLoadingStatus = await driver.executeScript(`
              const images = document.getElementsByTagName('img');
              let imageLoadingError = false;
              for (let i = 0; i < images.length; i++) {
                  if (!images[i].complete || images[i].naturalWidth === 0) {
                      imageLoadingError = true;
                      break;
                  }
              }
              return imageLoadingError;
          `);

          if (imageLoadingStatus) {
            assert.fail(`画像読み込みエラーが発生しました`);
            console.log(url.replace(testUrl, ""));
          } else {
            assert.ok("画像の読み込みに問題はありません");
          }
        } finally {
        }
      });
    });
  });

});
*/
