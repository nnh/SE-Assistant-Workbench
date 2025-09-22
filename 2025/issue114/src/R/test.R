rm(list = ls())
#### Load necessary libraries and source files ###
library(tidyverse)
library(pdftools)
library(here)
source(here("src/R/const.R"), encoding = "UTF-8")
source(here("src/R/function.R"), encoding = "UTF-8")
###  main section ###
# PDFファイルのパスを指定
pdf_path <- "/Users/mariko/Downloads/TORG-Osimertinib-NSCLC PRTv6.0.pdf"
protocol_name_and_version <- extract_version_info(pdf_path)
protocol_name <- protocol_name_and_version$protocol_name
version_info <- protocol_name_and_version$version_info
rm(protocol_name_and_version)
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
