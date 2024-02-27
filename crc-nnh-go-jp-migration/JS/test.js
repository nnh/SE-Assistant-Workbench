const { Builder, Capabilities, logging } = require("selenium-webdriver");
const cheerio = require("cheerio");
const fs = require("fs");

const pref = new logging.Preferences();
pref.setLevel(logging.Type.BROWSER, logging.Level.DEBUG);
const getReplaceList = () => {
  const nnhUrl = "https://crc.nnh.go.jp/";
  const wpContentJp = `${nnhUrl}wp-content/themes/NMC-CRC/images/`;
  const wpContentEn = `${nnhUrl}en/wp-content/themes/CRC-ENG/images/`;
  const pngList = [
    ["logo_01_nmc.png", "NHOロゴ"],
    ["logo_01_crc.png", "NMCロゴ"],
    ["btn_pageTop.png", "ページトップ"],
    ["logo_02_nmc.png", "NHOロゴ"],
    ["logo_02_crc.png", "NMCロゴ"],
  ];
  const replaceTextList = new Map();
  pngList.forEach((png) => {
    replaceTextList.set(`${wpContentJp}${png[0]}`, png[1]);
    replaceTextList.set(`${wpContentEn}${png[0]}`, png[1]);
  });
  return replaceTextList;
};
const getLinksFromHtmlString = (htmlString) => {
  const $ = cheerio.load(htmlString);
  const title = $("title").text();
  const links = [];
  const replaceTextList = getReplaceList();
  $("form").each((_, element) => {
    const text = $(element)
      .find(".screen-reader-text")
      .text()
      .replace(/\t/g, "")
      .replace(/\n/g, "");
    const url = $(element).attr("action");
    links.push({ title, url, text });
  });

  $("a").each((_, element) => {
    const url = $(element).attr("href");
    let text = $(element).text().replace(/\t/g, "").replace(/\n/g, "");
    if (!text) {
      const imgSrc = $(element).find("img").attr("src");
      text = replaceTextList.has(imgSrc) ? replaceTextList.get(imgSrc) : imgSrc;
    }
    links.push({ title, url, text });
  });
  return [links, title];
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
const testOpenPage = async (driver, url) => {
  try {
    await driver.get(url);
    const htmlString = await driver.getPageSource();
    console.log(url);
    const [links, title] = await getLinksFromHtmlString(htmlString);
    console.log(title);
    writeLinksToFile(links, `${title}.txt`);
  } catch (e) {
    console.log(e);
  } finally {
  }
};

const testWithBrowserCapabilities = async (capabilities) => {
  capabilities.setLoggingPrefs(pref);
  const driver = new Builder().withCapabilities(capabilities).build();
  const urls = ["https://crc.nnh.go.jp/", "https://crc.nnh.go.jp/en/"];
  for (const url of urls) {
    await testOpenPage(driver, url);
  }
  driver && (await driver.quit());
};

const main = async () => {
  //await testWithBrowserCapabilities(Capabilities.chrome());
  //await testWithBrowserCapabilities(Capabilities.firefox());
  await testWithBrowserCapabilities(Capabilities.safari());
};
main();
