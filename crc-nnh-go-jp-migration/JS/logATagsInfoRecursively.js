const fs = require("fs");
const path = require("path");
const cheerio = require("cheerio");

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

// フォルダ内のHTMLファイルを再帰的に取得する関数
const getHtmlFilesRecursively = (folderPath) => {
  const excludedFolders = ["/Users/mariko/Downloads/test20240216/wp-json"];
  const htmlFiles = [];
  const files = fs.readdirSync(folderPath);
  for (const file of files) {
    const filePath = path.join(folderPath, file);
    const stats = fs.statSync(filePath);
    if (stats.isDirectory()) {
      if (!excludedFolders.includes(filePath)) {
        htmlFiles.push(...getHtmlFilesRecursively(filePath, excludedFolders));
      }
    } else if (stats.isFile() && path.extname(filePath) === ".html") {
      htmlFiles.push(filePath);
    }
  }
  return htmlFiles;
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
  return links;
};

// Aタグの情報を取得してconsole.logに出力する関数
const logATagsInfo = (filePath) => {
  const htmlString = fs.readFileSync(filePath, "utf8");
  const $ = cheerio.load(htmlString);
  const links = getLinksFromHtmlString(htmlString);
  return links;
};

// 配列をファイルに出力する関数
const writeArrayToFile = (array, filename) => {
  const data = array.map((item) => JSON.stringify(item)).join("\n");
  fs.writeFileSync(filename, data);
};

// フォルダ内のHTMLファイルを再帰的に取得し、Aタグの情報をconsole.logに出力する関数
const logATagsInfoRecursively = (folderPath, outputFile) => {
  const htmlFiles = getHtmlFilesRecursively(folderPath);
  const allLinks = [];
  for (const htmlFile of htmlFiles) {
    const links = logATagsInfo(htmlFile);
    allLinks.push(...links);
  }
  writeArrayToFile(allLinks, outputFile);
};

// フォルダのパスを指定して、Aタグの情報をconsole.logに出力
logATagsInfoRecursively("/Users/mariko/Downloads/test20240216", "output.txt");
