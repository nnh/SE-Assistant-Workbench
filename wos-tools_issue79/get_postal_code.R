#' title
#' description
#' @file get_postal_code.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(rvest)
# ------ constants ------
# ------ functions ------
scrapePTags <- function(url) {
  # URLからHTMLを取得
  webpage <- read_html(url)

  # Pタグのテキストを抽出
  p_tags <- webpage %>%
    html_nodes("p") %>% # Pタグを選択
    html_text()         # テキストを抽出

  return(p_tags)
}

# ------ main ------

# 関数を使って指定されたURLからPタグのテキストを取得
url <- "https://nho.hosp.go.jp/about/cnt1-0_000103.html"
p_tags <- scrapePTags(url)
postalCode <- p_tags %>% map( ~ {
  text <- .
  if (str_detect(text, "〒.*")) {
    temp <- str_remove(str_remove(text, "〒"), "-")
    return(str_sub(temp, 1, 7))
  } else {
    return(NULL)
  }
}) %>% keep( ~ !is.null(.)) %>% list_c()
outputPostalCode <- postalCode %>% as.character() %>% str_c(collapse="','") %>% str_c("c('", ., "')")
write(outputPostalCode, here("postalCode.txt"))
# 結果を表示
