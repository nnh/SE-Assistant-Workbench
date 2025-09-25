rm(list = ls())
#### Load necessary libraries and source files ###
library(tidyverse)
library(pdftools)
library(here)
library(jsonlite)
library(googlesheets4)
library(googledrive)
source(here("src/R/const.R"), encoding = "UTF-8")
source(here("src/R/function.R"), encoding = "UTF-8")
config <- fromJSON(here("src/R/config.json"))
if (!is.null(config$mailAddress) && config$mailAddress != "") {
    gs4_auth(email = config$mailAddress)
} else {
    gs4_auth()
}
if (is.null(config$input_pdf_path) || config$input_pdf_path == "") {
    stop("Please set 'input_pdf_path' in config.json")
}
###  main section ###
# PDFファイルのパスを指定
pdf_path <- config$input_pdf_path

protocol_name_and_version <- extract_version_info(pdf_path)
protocol_name <- protocol_name_and_version$protocol_name
version_info <- protocol_name_and_version$version_info
if (config$protocol_name != protocol_name || config$version_info != version_info) {
    config$output_spreadsheet_id <- ""
}
rm(protocol_name_and_version)
if (is.null(config$output_spreadsheet_id) || config$output_spreadsheet_id == "") {
    # 新規スプレッドシートを作成
    sheet <- create_spreadsheet()
} else {
    # 既存のスプレッドシートを使用
    sheet <- get_spreadsheet(config$output_spreadsheet_id)
}
# config.jsonにIDを書き込む
config$output_spreadsheet_id <- sheet %>%
    gs4_get() %>%
    .$spreadsheet_id
write_json(config, here("src/R/config.json"), auto_unbox = TRUE, pretty = TRUE)

# PDFファイルから目次と本文情報を取得
pdf_info <- extract_pdf_info(pdf_path)
all_titles <- pdf_info$all_titles
textByPage <- pdf_info$textByPage
textList <- pdf_info$textList
rm(pdf_info)
# 目次情報からセクション番号、タイトル、開始ページを抽出
section_page <- extract_section_page(textByPage, textList)

# セクション番号とタイトルのペアリストをもとに、セクション番号、タイトル、開始ページを抽出
result <- extract_section_pairs_info(section_page)
output_values <- result %>%
    select(section_pair_number, output_text)
output_values <- output_values %>%
    group_by(section_pair_number) %>%
    filter(!(output_text == "該当なし" & any(output_text != "該当なし"))) %>%
    ungroup()
output_values_2 <- output_values %>% distinct()
# 試験薬情報
drug_info <- get_section_info(kDrugHeader, "試験薬情報")
# 概要
over_view_info <- get_section_info(kOverViewHeader, "概要")
# 選択基準
selection_criteria_info <- get_section_info(kSelectionCriteriaHeader, "選択基準")
# 除外基準
exclusion_criteria_info <- get_section_info(kExclusionCriteriaHeader, "除外基準")
# 表紙情報の取得
cover_info <- get_cover_info()
# bind rows
output_values <- cover_info %>%
    bind_rows(drug_info) %>%
    bind_rows(over_view_info) %>%
    bind_rows(selection_criteria_info) %>%
    bind_rows(exclusion_criteria_info) %>%
    bind_rows(output_values_2)
colnames(output_values) <- c("セクション番号", "該当箇所")
# スプレッドシートに書き込み
if (!(kSheetName %in% sheet_names(sheet))) {
    sheet_add(sheet, kSheetName)
}
range_clear(ss = sheet, sheet = kSheetName)
sheet_write(output_values, ss = sheet, sheet = kSheetName)
sheet_id <- sheet %>%
    gs4_get() %>%
    .$spreadsheet_id
message("プロトコル情報をスプレッドシートに書き込みました: ", sheet_id)
config$protocol_name <- protocol_name
config$version_info <- version_info
write_json(config, here("src/R/config.json"), auto_unbox = TRUE, pretty = TRUE)
