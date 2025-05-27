/**
 * Copyright 2023 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// PubMed URLs to extract IDs from
const pubmedUrls = [
  'https://pubmed.ncbi.nlm.nih.gov/39711579',
  'https://pubmed.ncbi.nlm.nih.gov/38535873/',
];

// Extract unique PubMed IDs
export const pubmedIds: string[] = Array.from(
  new Set(
    pubmedUrls
      .map(url => {
        const match = url.match(/\/(\d+)\/?$/);
        return match ? match[1] : null;
      })
      .filter(Boolean)
  )
).filter(id => id !== null);

// Build efetch URL
//const efetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${pubmedIds.join(',')}&retmode=xml`;
const efetchUrl = null; // GASではUrlFetchAppを使うため、直接URLを指定しない

export function fetchPubmedData_(): string[][] | undefined {
  // GASではUrlFetchAppを使う
  let response;
  if (efetchUrl) {
    response = UrlFetchApp.fetch(efetchUrl);
  } else {
    // 指定フォルダ内の"pubmed.xml"ファイルを取得
    const scriptProperties = PropertiesService.getScriptProperties();
    const folderId = scriptProperties.getProperty('PUBMED_FOLDER_ID'); // スクリプトプロパティから取得
    if (!folderId) {
      console.log(
        'PUBMED_FOLDER_IDが設定されていません。スクリプトプロパティを確認してください。'
      );
      return;
    }
    const folder = DriveApp.getFolderById(folderId);
    const files = folder.getFilesByName('pubmed.xml');
    let file: GoogleAppsScript.Drive.File | null = null;
    let count = 0;
    while (files.hasNext()) {
      file = files.next();
      count++;
      if (count > 1) break;
    }
    if (count === 1 && file) {
      response = {
        getContentText: () => file!.getBlob().getDataAsString(),
      };
    } else {
      // "pubmed.xml"が複数または存在しない場合は何もしない
      console.log('"pubmed.xml"が複数存在します。');
      return;
    }
  }
  const xml = response.getContentText();
  // GASではxml2jsは使えないので、XmlServiceを使う
  const document = XmlService.parse(xml);
  const root = document.getRootElement(); // PubmedArticleSet

  // Prepare 2D array: [ [PubMedID, JournalTitle, JournalISOAbbreviation, ISSN, Year, Volume, Issue, ArticleTitle], ... ]
  const articles: string[][] = [];

  const pubmedArticles = root.getChildren('PubmedArticle');
  for (const article of pubmedArticles) {
    const medline = article.getChild('MedlineCitation');
    const pmid = medline?.getChild('PMID')?.getText() || '';
    const articleElem = medline?.getChild('Article');
    const journal = articleElem?.getChild('Journal');
    const journalTitle = journal?.getChild('Title')?.getText() || '';
    const journalISO = journal?.getChild('ISOAbbreviation')?.getText() || '';
    const issn = journal?.getChild('ISSN')?.getText() || '';
    const journalIssue = journal?.getChild('JournalIssue');
    const pubDate = journalIssue?.getChild('PubDate');
    const year = pubDate?.getChild('Year')?.getText() || '';
    const volume = journalIssue?.getChild('Volume')?.getText() || '';
    const issue = journalIssue?.getChild('Issue')?.getText() || '';
    const articleTitleElem = articleElem?.getChild('ArticleTitle');
    const articleTitle = articleTitleElem ? articleTitleElem.getText() : '';

    // 1行目に見出しを追加（最初のループ時のみ）
    if (articles.length === 0) {
      articles.push([
        'PubMedID',
        'JournalTitle',
        'JournalISOAbbreviation',
        'ISSN',
        'Year',
        'Volume',
        'Issue',
        'ArticleTitle',
      ]);
    }
    articles.push([
      pmid,
      journalTitle,
      journalISO,
      issn,
      year,
      volume,
      issue,
      articleTitle,
    ]);
  }
  return articles;
}
