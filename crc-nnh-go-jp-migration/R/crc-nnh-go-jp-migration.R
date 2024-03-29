#' title
#' description
#' @file crc-nnh-go-jp-migration.R
#' @author Mariko Ohtsuka
#' @date 2024.3.29
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(rvest)
library(googlesheets4)
# ------ constants ------
kSheetName <- "wk"
kDownloadSheetName <- str_c(kSheetName, "_download")
kNewWindowSheetName <- str_c(kSheetName, "_newWindow")
kTargetXpath <- '//*[@id="content"]'
kConstText <- 'commonXpath.get("bodyContents")'
source(here("testUrl.R"), encoding="utf-8")
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
  linkData <- tryCatch({
    html <- read_html(url)
    Sys.sleep(10)
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
  }, error = function(e) {
    message("Error occurred: ", conditionMessage(e), url)
    return(NA)
  })

  return(linkData)
}


WriteToSs <- function(df, sheet_name) {
  sheet_id <- here("sheet_id.txt") %>% ReadSheetId() %>% .[1] # Google スプレッドシートのIDが書かれたファイルのパスをここに入力
  googlesheets4::write_sheet(df, sheet_id, sheet_name)
}
# ------ main ------
testUrl <- split(targetUrl, (seq_along(targetUrl) - 1) %/% 20)
df_list <- testUrl %>% map( ~ {
  url_list <- .
  df <- url_list %>% map( ~ GetLinkData(.))
  return(df)
})
df <- df_list %>% map( ~ {
  temp <- .
  res <- temp %>% keep( ~ is.data.frame(.))
  return(res)
}) %>% bind_rows()

download_df <- df %>% filter(str_detect(nextDir, ".xls") | str_detect(nextDir, "\\.doc"))
no_download_df <-  df %>% filter(!str_detect(nextDir, ".xls") & !str_detect(nextDir, "\\.doc"))
output_df <- no_download_df %>% filter(is.na(new_window)) %>% select(-"new_window")
new_window_df <- no_download_df %>% filter(!is.na(new_window)) %>% select(-"new_window")

gs4_auth()
WriteToSs(download_df, kDownloadSheetName)
WriteToSs(output_df, kSheetName)
WriteToSs(new_window_df, kNewWindowSheetName)
