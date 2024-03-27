#' title
#' description
#' @file crc-nnh-go-jp-migration.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(rvest)
library(googlesheets4)
# ------ constants ------
kSheetName <- "20240327"
kTopUrl <- 'https://crc.nnh.go.jp/'
kLevel2 <- c("about_us/",
             "accomplishments/",
             "aro/",
             "clinical_trial_services/",
             "contact/",
             "departments/",
             "education_and_public_relations/",
             "en/",
             "form/",
             "links/",
             "news/",
             "public_information/",
             "publication/",
             "seminar/",
             "sitemap/",
             "staff/")
# ------ functions ------
ReadSheetId <- function(file_path) {
  if (file.exists(file_path)) {
    sheet_id <- readLines(file_path)
    return(sheet_id)
  } else {
    stop("指定されたファイルが見つかりません。")
  }
}

GetLinkData <- function(url) {
  # HTMLを取得
  html <- read_html(url)
  Sys.sleep(1)
  # コンテンツ内のすべてのリンクを取得
  targetHtml <- html %>% html_elements(xpath='//*[@id="content"]')
  links <- targetHtml %>% html_elements("a")
  title <- html %>% html_element(xpath='/html/head/title') %>% html_text()
  # リンクのURLとテキストをデータフレームに保存
  linkData <- links %>% map_df( ~ {
    link <- .
    href <- html_attr(link, "href")
    text <- html_text(link)
    return(list(title=title, parent=url, url=href, text=text, xpath=""))
  }) %>% filter(url != "#")
  return(linkData)
}
WriteToSs <- function(df, sheet_name) {
  sheet_id <- here("sheet_id.txt") %>% ReadSheetId() %>% .[1] # Google スプレッドシートのIDが書かれたファイルのパスをここに入力
  gs4_auth()
  googlesheets4::write_sheet(df, sheet_id, sheet_name)
}

# 階層2
level2Url <- str_c(kTopUrl, kLevel2)
testUrl <- list(kTopUrl, "http://crc.nnh.go.jp/aro/", "http://crc.nnh.go.jp/aro/edc")
testUrl <- testUrl %>% append(level2Url)
df <- testUrl %>% map_df( ~ GetLinkData(.))
WriteToSs(df, kSheetName)
