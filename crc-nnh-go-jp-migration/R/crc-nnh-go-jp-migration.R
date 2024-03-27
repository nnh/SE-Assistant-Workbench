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
# ------ functions ------
ReadSheetId <- function(file_path) {
  if (file.exists(file_path)) {
    sheet_id <- readLines(file_path)
    return(sheet_id)
  } else {
    stop("指定されたファイルが見つかりません。")
  }
}

SaveLinksToGoogleSheet <- function(url, sheet_id_file, sheet_name) {
  tryCatch({
    # HTMLを取得
    html <- read_html(url)

    # コンテンツ内のすべてのリンクを取得
    links <- html_nodes(html, "#content a")

    # リンクのURLとテキストをデータフレームに保存
    linkData <- lapply(links, function(link) {
      href <- html_attr(link, "href")
      text <- html_text(link)
      data.frame(URL = href, Text = text, stringsAsFactors = FALSE)
    })
    linkDataFrame <- do.call(rbind, linkData) %>% filter(URL != "#")

    # Google Sheetsに接続
    gs4_auth()

    # スプレッドシートを開く
    googlesheets4::write_sheet(linkDataFrame, sheet_id, sheet_name)
    cat(paste("リンク一覧を Google スプレッドシートの", sheet_name, "シートに保存しました。\n"))
  }, error = function(e) {
    cat("エラーが発生しました:", conditionMessage(e), "\n")
  })
}

# テスト用のURLとGoogle スプレッドシートの情報を指定して処理を実行
testUrl <- 'https://crc.nnh.go.jp/' # テスト用のURLをここに入力
sheet_id <- here("sheet_id.txt") %>% ReadSheetId() %>% .[1] # Google スプレッドシートのIDが書かれたファイルのパスをここに入力
sheet_name <- "sheet1" # シート名をここに入力
SaveLinksToGoogleSheet(testUrl, sheet_id, sheet_name)
