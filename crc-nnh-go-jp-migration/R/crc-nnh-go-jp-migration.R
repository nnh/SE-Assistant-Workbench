#' title
#' description
#' @file crc-nnh-go-jp-migration.R
#' @author Mariko Ohtsuka
#' @date 2024.3.28
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(rvest)
library(googlesheets4)
# ------ constants ------
kSheetName <- "wk"
kNewWindowSheetName <- str_c(kSheetName, "_newWindow")
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
kTargetXpath <- '//*[@id="content"]'
kConstText <- 'commonXpath.get("bodyContents")'
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
  targetHtml <- html %>% html_elements(xpath=kTargetXpath)
  links <- targetHtml %>% html_elements("a")
  title <- html %>% html_element(xpath='/html/head/title') %>% html_text()
  # リンクのURLとテキストをデータフレームに保存
  linkData <- links %>% map_df( ~ {
    link <- .
    new_window <- html_attr(link, "target")
    href <- html_attr(link, "href")
    text <- html_text(link)
    return(list(title=title, url=url, targetContents=kTargetXpath ,aXpath="", nextDir=href, label=text, new_window=new_window))
  }) %>% filter(nextDir != "#")
  return(linkData)
}
WriteToSs <- function(df, sheet_name) {
  sheet_id <- here("sheet_id.txt") %>% ReadSheetId() %>% .[1] # Google スプレッドシートのIDが書かれたファイルのパスをここに入力
  googlesheets4::write_sheet(df, sheet_id, sheet_name)
}

# 階層2
level2Url <- str_c(kTopUrl, kLevel2)
testUrl <- list(kTopUrl)
testUrl <- testUrl %>% append(level2Url)
df <- testUrl %>% map_df( ~ GetLinkData(.))
output_df <- df %>% filter(is.na(new_window)) %>% select(-"new_window")
new_window_df <- df %>% filter(!is.na(new_window)) %>% select(-"new_window")
gs4_auth()
WriteToSs(output_df, kSheetName)
WriteToSs(new_window_df, kNewWindowSheetName)
