library(xml2)
# --- functions ---
download_pubmed_xml <- function(pmid_list, save_dir = get_download_folder_path(), batch_size = 100) {
  if (missing(pmid_list) || !is.vector(pmid_list) || length(pmid_list) == 0 || !all(nzchar(pmid_list))) {
    message("pmid_listが空、ベクトルでない、または無効な値を含んでいます")
    return(invisible(NULL))
  }
  pmid_batches <- split(pmid_list, ceiling(seq_along(pmid_list) / batch_size))
  for (i in seq_along(pmid_batches)) {
    pmids <- pmid_batches[[i]]
    pmid_str <- paste(pmids, collapse = ",")
    url <- paste0(
      "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=",
      pmid_str,
      "&retmode=xml"
    )
    date_str <- format(Sys.Date(), "%Y%m%d")
    save_path <- file.path(save_dir, sprintf("pubmed_%s_%03d.xml", date_str, i))
    tryCatch(
      {
        download.file(url, destfile = save_path, mode = "wb", quiet = TRUE)
        message("Saved: ", save_path)
      },
      error = function(e) {
        message("Failed: ", save_path, " - ", e$message)
      }
    )
    Sys.sleep(5)
  }
}

fetch_pubmed_data <- function() {
  download_path <- get_download_folder_path()
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
  # すべてのファイルを読み込んで結合
  xml_path <- latest_files
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
    pmid <- xml_text(xml_find_first(article, ".//PMID"))
    journal_title <- xml_text(xml_find_first(article, ".//Journal/Title"))
    journal_iso <- xml_text(xml_find_first(article, ".//Journal/ISOAbbreviation"))
    issn <- xml_text(xml_find_first(article, ".//Journal/ISSN"))
    year <- xml_text(xml_find_first(article, ".//PubDate/Year"))
    month <- xml_text(xml_find_first(article, ".//PubDate/Month"))
    volume <- xml_text(xml_find_first(article, ".//JournalIssue/Volume"))
    issue <- xml_text(xml_find_first(article, ".//JournalIssue/Issue"))
    article_title <- xml_text(xml_find_first(article, ".//ArticleTitle"))

    article_list[[length(article_list) + 1]] <- c(
      PubMedID = pmid,
      JournalTitle = journal_title,
      JournalISOAbbreviation = journal_iso,
      ISSN = issn,
      Year = year,
      month = month,
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
