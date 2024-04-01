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
kAnchorSheetName <- str_c(kSheetName, "_anchor")
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
anchor_df <- df %>% filter(str_detect(nextDir, "^#"))
no_anchor_df <- df %>% filter(!str_detect(nextDir, "^#"))
download_df <- no_anchor_df %>% filter(str_detect(nextDir, ".xls") | str_detect(nextDir, "\\.doc") | str_detect(nextDir, "\\.zip"))
no_download_df <-  no_anchor_df %>% filter(!str_detect(nextDir, ".xls") & !str_detect(nextDir, "\\.doc") & !str_detect(nextDir, "\\.zip"))
edit_no_download_df <- no_download_df
temp <- edit_no_download_df$nextDir %>% str_remove("#.*$") %>% map_vec( ~ {
  url <- .
  url_split <- url %>% str_split("/") %>% unlist()
  url_last <- url_split[length(url_split)]
  if (url_last == "") {
    return(url)
  }
  if (str_detect(url_last, "\\.")) {
    return(url)
  }
  return(str_c(url, "/"))

})
edit_no_download_df$nextDir <- temp
rm(temp)

output_df <- edit_no_download_df %>% filter(is.na(new_window)) %>% select(-"new_window")
new_window_df <- edit_no_download_df %>% filter(!is.na(new_window)) %>% select(-"new_window")

gs4_auth()
WriteToSs(anchor_df, kAnchorSheetName)
WriteToSs(download_df, kDownloadSheetName)
WriteToSs(output_df, kSheetName)
WriteToSs(new_window_df, kNewWindowSheetName)
