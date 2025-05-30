source("common.r")
library(xml2)
# --- functions ---
get_download_folder_path <- function() {
  user_profile <- Sys.getenv("USERPROFILE")
  if (user_profile == "") {
    stop("USERPROFILE 環境変数が取得できませんでした。")
  }
  download_path <- file.path(user_profile, "Downloads")
  return(normalizePath(download_path, winslash = "\\", mustWork = FALSE))
}
fetch_pubmed_data <- function() {
  download_path <- get_download_folder_path()
  xml_path <- file.path(download_path, "pubmed.xml")
  # XMLファイルの読み込み
  if (!file.exists(xml_path)) {
    message("ファイルが存在しません: ", xml_path)
    return(NULL)
  }
  doc <- read_xml(xml_path)
  articles <- xml_find_all(doc, ".//PubmedArticle")

  # データ格納用リスト
  article_list <- list()

  for (article in articles) {
    pmid <- xml_text(xml_find_first(article, ".//PMID"))
    journal_title <- xml_text(xml_find_first(article, ".//Journal/Title"))
    journal_iso <- xml_text(xml_find_first(article, ".//Journal/ISOAbbreviation"))
    issn <- xml_text(xml_find_first(article, ".//Journal/ISSN"))
    year <- xml_text(xml_find_first(article, ".//PubDate/Year"))
    volume <- xml_text(xml_find_first(article, ".//JournalIssue/Volume"))
    issue <- xml_text(xml_find_first(article, ".//JournalIssue/Issue"))
    article_title <- xml_text(xml_find_first(article, ".//ArticleTitle"))

    article_list[[length(article_list) + 1]] <- c(
      PubMedID = pmid,
      JournalTitle = journal_title,
      JournalISOAbbreviation = journal_iso,
      ISSN = issn,
      Year = year,
      Volume = volume,
      Issue = issue,
      ArticleTitle = article_title
    )
  }

  # データフレームに変換
  if (length(article_list) == 0) {
    return(NULL)
  }

  df <- as_tibble(do.call(rbind, article_list), .name_repair = "unique")
  return(df)
}
# --- main ---
pubmed_data <- fetch_pubmed_data()
print(pubmed_data)
