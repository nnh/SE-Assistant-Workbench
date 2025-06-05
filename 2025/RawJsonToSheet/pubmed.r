library(xml2)
# --- functions ---
get_target_pubmed_files <- function(download_path = data_path) {
  # ダウンロードフォルダ内のpubmed_yyyymmdd_xxx.xmlファイルを取得
  files <- list.files(download_path, pattern = "^pubmed_\\d{8}_\\d{3}\\.xml$", full.names = TRUE)
  if (length(files) == 0) {
    message("該当するXMLファイルがありません")
    return(NULL)
  }
  # yyyymmdd部分を抽出して最新日付を特定
  dates <- sub("^.*pubmed_(\\d{8})_\\d{3}\\.xml$", "\\1", files)
  latest_date <- max(dates)
  # 最新日付のファイルのみ抽出
  latest_files <- files[dates == latest_date]
  return(latest_files)
}

fetch_pubmed_data <- function(download_path = data_path) {
  # すべてのファイルを読み込んで結合
  xml_path <- get_target_pubmed_files(download_path)
  # XMLファイルの読み込み
  articles <- list()
  for (path in xml_path) {
    if (!file.exists(path)) {
      message("ファイルが存在しません: ", path)
      next
    }
    doc <- read_xml(path)
    articles_in_file <- xml_find_all(doc, ".//PubmedArticle")
    articles <- c(articles, articles_in_file)
  }

  # データ格納用リスト
  article_list <- list()

  for (article in articles) {
    # PubMedPubDate PubStatus="pmc-release" の年月日を取得
    pmc_release_node <- xml_find_first(article, ".//PubMedPubDate[@PubStatus='pmc-release']")
    if (!is.na(pmc_release_node)) {
      pmc_release_year <- xml_text(xml_find_first(pmc_release_node, "./Year"))
      pmc_release_month <- xml_text(xml_find_first(pmc_release_node, "./Month"))
      pmc_release_day <- xml_text(xml_find_first(pmc_release_node, "./Day"))
    } else {
      pmc_release_year <- NA
      pmc_release_month <- NA
      pmc_release_day <- NA
    }
    pmc_release_date <- paste(pmc_release_year, pmc_release_month, pmc_release_day, sep = "-")
    pmid <- xml_text(xml_find_first(article, ".//PMID"))
    year <- xml_text(xml_find_first(article, ".//PubDate/Year"))
    month <- xml_text(xml_find_first(article, ".//PubDate/Month"))
    volume <- xml_text(xml_find_first(article, ".//JournalIssue/Volume"))
    issue <- xml_text(xml_find_first(article, ".//JournalIssue/Issue"))
    article_title <- xml_text(xml_find_first(article, ".//ArticleTitle"))
    article_date_node <- xml_find_first(article, ".//ArticleDate[@DateType='Electronic']")
    if (!is.na(article_date_node)) {
      article_year <- xml_text(xml_find_first(article_date_node, "./Year"))
      article_month <- xml_text(xml_find_first(article_date_node, "./Month"))
      article_day <- xml_text(xml_find_first(article_date_node, "./Day"))
    } else {
      article_year <- NA
      article_month <- NA
      article_day <- NA
    }
    # AuthorListノードを取得し、すべてのAuthorノードを抽出
    author_nodes <- xml_find_all(article, ".//AuthorList/Author")
    # 各AuthorノードからAffiliationInfo/Affiliationをすべて取得し、1つのAffiliationごとにレコードを作成
    for (i in seq_along(author_nodes)) {
      author <- author_nodes[[i]]
      last <- xml_text(xml_find_first(author, "./LastName"))
      fore <- xml_text(xml_find_first(author, "./ForeName"))
      author_name <- paste(na.omit(c(last, fore)), collapse = ", ")
      aff_nodes <- xml_find_all(author, "./AffiliationInfo/Affiliation")
      if (length(aff_nodes) == 0) {
        # Affiliationがない場合もレコードを作成
        article_list[[length(article_list) + 1]] <- c(
          PubMedID = pmid,
          DP_Year = year,
          DP_Month = month,
          Volume = volume,
          Issue = issue,
          ArticleTitle = article_title,
          DEP_Year = article_year,
          DEP_Month = article_month,
          DEP_Day = article_day,
          Author = author_name,
          Affiliation = NA,
          PMC_Release_Date = pmc_release_date
        )
      } else {
        for (aff in aff_nodes) {
          aff_text <- xml_text(aff)
          article_list[[length(article_list) + 1]] <- c(
            PubMedID = pmid,
            DP_Year = year,
            DP_Month = month,
            Volume = volume,
            Issue = issue,
            ArticleTitle = article_title,
            DEP_Year = article_year,
            DEP_Month = article_month,
            DEP_Day = article_day,
            Author = author_name,
            Affiliation = aff_text,
            PMC_Release_Date = pmc_release_date
          )
        }
      }
    }
    next
  }

  # データフレームに変換
  if (length(article_list) == 0) {
    return(NULL)
  }

  df <- as_tibble(do.call(rbind, article_list), .name_repair = "unique")
  return(df)
}
# --- main ---
