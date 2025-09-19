library(tidyverse)
library(pdftools)
# 再帰的に title を集める関数
extract_titles <- function(x) {
    titles <- character(0)

    if (is.list(x)) {
        # title 要素があれば追加
        if (!is.null(x$title)) {
            titles <- c(titles, x$title)
        }
        # children があれば再帰呼び出し
        if (!is.null(x$children) && is.list(x$children)) {
            child_titles <- unlist(lapply(x$children, extract_titles))
            titles <- c(titles, child_titles)
        }
    }

    return(titles)
}

# PDFファイルのパスを指定
pdf_path <- "/Users/mariko/Downloads/TORG-Osimertinib-NSCLC PRTv6.0.pdf"

# ファイル名からバージョン情報を取得
version_info <- str_extract(basename(pdf_path), regex("v[0-9]+\\.[0-9]+", ignore_case = TRUE)) %>% str_remove(regex("^v", ignore_case = TRUE))

# PDFの目次情報を取得
toc_info <- pdf_toc(pdf_path)
all_titles <- extract_titles(toc_info) %>% discard(~ .x == "")

textByPage <- pdf_text(pdf_path)
textList <- pdf_data(pdf_path)
# 目次開始ページ
index_toc_start <- which(str_detect(textByPage, "目次\\n"))[1] %>% as.integer()
index_toc_end <- which(str_detect(textByPage, "1\\. 研究計画書要旨\\n"))[1] %>% as.integer()
indexPages <- textList[index_toc_start:index_toc_end]
# 各ページごとにyごとにtextを結合
indexPages_merged <- lapply(indexPages, function(df) {
    df %>%
        group_by(y) %>%
        summarise(text = paste(text, collapse = " "), .groups = "drop")
}) %>% bind_rows()
indexPages_merged <- indexPages_merged %>%
    mutate(
        section_number = str_extract(text, "^[0-9]+(?:\\.[0-9]+)*\\.?"),
        section_value = str_remove(text, "^[0-9]+(?:\\.[0-9]+)*\\.?") %>% str_replace("\\s[0-9]+$", "") %>% str_trim(),
        section_text = str_replace(text, "\\s[0-9]+$", ""),
        page_start = str_extract(text, "[0-9]+$")
    ) %>%
    select("section_number", "section_value", "section_text", "page_start")
section_page <- indexPages_merged %>%
    filter(!is.na(page_start)) %>%
    filter(!is.na(section_number)) %>%
    filter(!is.na(section_value))
