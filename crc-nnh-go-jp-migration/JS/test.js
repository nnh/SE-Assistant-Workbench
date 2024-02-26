const { Builder, Capabilities, logging } = require("selenium-webdriver");
const cheerio = require("cheerio");

const pref = new logging.Preferences();
pref.setLevel(logging.Type.BROWSER, logging.Level.DEBUG);

/**
 * google.comを開いて、成功したらブラウザーを終了します。
 * @param driver
 * @returns {Promise<void>}
 */
const testOpenPage = async (driver) => {
  try {
    await driver.get("https://crc.nnh.go.jp/");
    const htmlString = await driver.getPageSource();
    const $ = cheerio.load(htmlString);
    const links = [];
    $("a").each((index, element) => {
      const url = $(element).attr("href");
      const text = $(element).text();
      links.push({ url, text });
    });
    for (const link of links) {
      console.log(`${link.url}, ${link.text}`);
      if (isValidUrl(link.url)) {
        await driver.get(link.url, { url: link.url });
        //  const resultHtmlString = await driver.getPageSource();
        const statusCode = await driver.executeScript(
          "return window.location.href"
        );
        console.log(statusCode);
        //console.log(resultHtmlString);
      } else {
        //console.log("Invalid URL:", link.url);
      }
    }
  } catch (e) {
    console.log(e);
  } finally {
    driver && (await driver.quit());
  }
};

const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch (e) {
    return false;
  }
};

const testWithBrowserCapabilities = (capabilities) => {
  capabilities.setLoggingPrefs(pref);
  const driver = new Builder().withCapabilities(capabilities).build();
  testOpenPage(driver);
};
//testWithBrowserCapabilities(Capabilities.chrome());
//testWithBrowserCapabilities(Capabilities.firefox());
testWithBrowserCapabilities(Capabilities.safari());
