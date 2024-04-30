// defineTestLinkClick.js
const { he } = require("date-fns/locale");
const {
  linkClickTestListIndex,
  targetUrlList,
  commonXpath,
} = require("./defineTestCommonInfo.js");
const {
  linkList,
  newWindowList,
  testUrl,
} = require("./defineTestLinkClickByPage.js");

const topPageUrl = targetUrlList[0];
const headerFooterMenuEnglishList = [
  [
    commonXpath.get("headerEnglish"),
    '//*[@id="masthead"]/div/div[1]/h1/div[1]/a',
    "https://nagoya.hosp.go.jp/eng/",
    "ヘッダー：名古屋医療センターロゴ",
  ],
];

function getHeaderFooterMenuList(targetUrlList, headerFooterMenuList) {
  const linkClickTestHeaderFooterMenu = targetUrlList
    .map((url) => {
      return headerFooterMenuList.map((menu) => {
        return [url, ...menu];
      });
    })
    .flat();
  const res = new Map(
    targetUrlList.map((url) => [url, linkClickTestHeaderFooterMenu])
  );
  return res;
}

function getHeaderFooterMenuListJpAndEn() {
  const headerFooterMenuList = [
    [
      commonXpath.get("header"),
      '//*[@id="masthead"]/div/div[1]/h1/div[1]/a',
      "https://nagoya.hosp.go.jp/",
      "ヘッダー：名古屋医療センターロゴ",
    ],
    [
      commonXpath.get("header"),
      '//*[@id="masthead"]/div/div[1]/h1/div[2]',
      topPageUrl,
      "臨床研究センター",
    ],
    [
      commonXpath.get("header"),
      '//*[@id="menu-item-14585"]/a',
      `${topPageUrl}about_us/`,
      "ご挨拶",
    ],
    [
      commonXpath.get("header"),
      '//*[@id="menu-item-14586"]/a',
      `${topPageUrl}departments/`,
      "部門",
    ],
    [
      commonXpath.get("header"),
      '//*[@id="menu-item-16255"]/a',
      `${topPageUrl}aro/`,
      "ARO",
    ],
    [
      commonXpath.get("header"),
      '//*[@id="menu-item-16154"]/a',
      `${topPageUrl}clinical_trial_services/`,
      "治験・臨床研究",
    ],
    [
      commonXpath.get("header"),
      '//*[@id="menu-item-14587"]/a',
      `${topPageUrl}staff/`,
      "スタッフ",
    ],
    [
      commonXpath.get("header"),
      '//*[@id="menu-item-721907"]/a',
      `${topPageUrl}accomplishments/`,
      "研究成果",
    ],
    [
      commonXpath.get("header"),
      '//*[@id="menu-item-14588"]/a',
      `${topPageUrl}public_information/`,
      "公開情報",
    ],
    [
      commonXpath.get("header"),
      '//*[@id="masthead"]/div/div[2]/div[1]/ul/li[2]/a',
      `${topPageUrl}en/`,
      "English",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="colophon"]/div/div[1]/a[1]',
      "https://nagoya.hosp.go.jp/",
      "フッター：名古屋医療センターロゴ",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="colophon"]/div/div[1]/a[2]',
      topPageUrl,
      "フッター：臨床研究センター",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-11"]/a',
      "https://nagoya.hosp.go.jp/",
      "名古屋医療センター",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16256"]/a',
      topPageUrl,
      "臨床研究センター",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16257"]/a',
      `${topPageUrl}about_us/`,
      "ご挨拶",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16258"]/a',
      `${topPageUrl}departments/`,
      "部門",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16259"]/a',
      `${topPageUrl}aro/`,
      "ＡＲＯ",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16260"]/a',
      `${topPageUrl}clinical_trial_services/`,
      "治験・臨床研究",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16261"]/a',
      `${topPageUrl}staff/`,
      "スタッフ",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16262"]/a',
      `${topPageUrl}departments/education_and_public_relations/seminar/`,
      "セミナー情報",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-138"]/a',
      `${topPageUrl}news/`,
      "ニュース",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16265"]/a',
      `${topPageUrl}contact/`,
      "連絡先",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16263"]/a',
      `${topPageUrl}links/`,
      "リンク",
    ],
    [
      commonXpath.get("footer"),
      '//*[@id="menu-item-16264"]/a',
      `${topPageUrl}sitemap/`,
      "サイトマップ",
    ],
  ];
  const urlJp = targetUrlList.filter((url) => !/en\//.test(url));
  const urlEn = targetUrlList.filter((url) => /en\//.test(url));
  const linkClickTestHeaderFooterMenuJp = getHeaderFooterMenuList(
    urlJp,
    headerFooterMenuList
  );
  const linkClickTestHeaderFooterMenuEn = getHeaderFooterMenuList(
    urlEn,
    headerFooterMenuEnglishList
  );
  const res = new Map([
    ...linkClickTestHeaderFooterMenuJp,
    ...linkClickTestHeaderFooterMenuEn,
  ]);
  return res;
}
function getTargetListByUrl() {
  const linkTargets = new Set(
    linkList.map((x) => x[linkClickTestListIndex.get("url")])
  );
  const linkClickTestHeaderFooterMenu = getHeaderFooterMenuListJpAndEn();
  const urlListArray = targetUrlList.map((url) => {
    const links = linkList.filter(
      (link) => link[linkClickTestListIndex.get("url")] === url
    );
    const windowList = newWindowList.filter(
      (link) => link[linkClickTestListIndex.get("url")] === url
    );
    const headerFooter = linkClickTestHeaderFooterMenu.get(url);
    const targetHeaderFooter = headerFooter.filter(
      (x) => x[linkClickTestListIndex.get("url")] === url
    );
    const clickList = linkTargets.has(url)
      ? [url, [...links, ...targetHeaderFooter]]
      : null;
    const clickListWindow = windowList.length > 0 ? [url, windowList] : null;
    return [clickList, clickListWindow];
  });
  const urlList = new Map(
    urlListArray.map((x) => x[0]).filter((x) => x !== null)
  );
  const windowList = new Map(
    urlListArray.map((x) => x[1]).filter((x) => x !== null)
  );
  return [urlList, windowList];
}
const [urlAndlinkList, urlAndWindowList] = getTargetListByUrl();
module.exports = {
  linkClickTestListIndex,
  urlAndlinkList,
  targetUrlList,
  urlAndWindowList,
}; // 関数をエクスポート
