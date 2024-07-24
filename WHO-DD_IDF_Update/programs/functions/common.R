#' title
#' description
#' @file common.R
#' @author Mariko Ohtsuka
#' @date 2024.7.24
# ------ libraries ------
library(tidyverse)
library(here)
# ------ constants ------
kIdf <- "idf"
kWhodd <- "whodd"
kWhoddZip <- "whoddZip"
kZipDirName <- "圧縮ファイル"
kIdfAllFooter <- "_all"
kZipExtention <- ".zip"
kIdfFileNameHeader <- "mtlt"
kIdfFileNameParts <- str_c("(?i)^", kIdfFileNameHeader, "2[0-9]{5}")
kIdfFileNameString <- str_c(kIdfFileNameParts, ".*", kZipExtention, "$")
kWhoddJapanCrtParts <- "(?i)^WHODrug\\sJapan\\sCRT"
KIdfBoxDirName <- "IDF"
KWhoddBoxDirName <- "WHO-DD"
kIdfPasswordFileFooter <- "_pw.txt"
kAwsParentDirName <- "WHO-DD_IDF"
# ------ functions ------
source(here("programs", "functions", "common-functions.R"),  encoding="UTF-8")
source(here("programs", "functions", "box-functions.R"),  encoding="UTF-8")
# ------ main ------
dummy <- GetConfigText()
dummy <- GetREnviron()
downloads_path <- GetFolderPath("Downloads")
