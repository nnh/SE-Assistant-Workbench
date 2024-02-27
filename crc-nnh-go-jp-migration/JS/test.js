const { Builder, Capabilities, logging } = require("selenium-webdriver");
const cheerio = require("cheerio");
const fs = require("fs");

const pref = new logging.Preferences();
pref.setLevel(logging.Type.BROWSER, logging.Level.DEBUG);

const getLinksFromHtmlString = (htmlString) => {
  const $ = cheerio.load(htmlString);
  const title = $("title").text();
  const links = [];
  $("a").each((index, element) => {
    const url = $(element).attr("href");
    let text = $(element).text().replace(/\t/g, "").replace(/\n/g, "");
    if (!text) {
      console.log("test");
      const imgSrc = $(element).find("img").attr("src");
      text = imgSrc;
    }
    links.push({ title, url, text });
  });
  return links;
};

const writeLinksToFile = (links, filename) => {
  const data = links
    .map((link) => `${link.title}, ${link.url}, ${link.text}`)
    .join("\n");
  fs.writeFileSync(filename, data);
};

/**
 * google.comを開いて、成功したらブラウザーを終了します。
 * @param driver
 * @returns {Promise<void>}
 */
const testOpenPage = async (driver) => {
  try {
    await driver.get("https://crc.nnh.go.jp/");
    const htmlString = await driver.getPageSource();
    const links = getLinksFromHtmlString(htmlString);
    writeLinksToFile(links, "links.txt");
    /*    for (const link of links) {
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
        }*/
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
