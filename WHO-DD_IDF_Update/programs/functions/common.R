#' title
#' description
#' @file common.R
#' @author Mariko Ohtsuka
#' @date 2024.8.7
# ------ libraries ------
library(tidyverse)
library(here)
library(fs)
# ------ constants ------
kMeddra <- "meddra"
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
kMeddraZipParts <- "(?i)^MEDDRAJ[0-9]+"
KIdfBoxDirName <- "IDF"
KWhoddBoxDirName <- "WHO-DD"
kMeddraBoxDirName <- "MedDRA"
kIdfPasswordFileFooter <- "_pw.txt"
kAwsParentDirName <- "WHO-DD_IDF"
kMeddraAwsParentDirName <- kMeddraBoxDirName
# ------ functions ------
source(here("programs", "functions", "common-functions.R"),  encoding="UTF-8")
source(here("programs", "functions", "box-functions.R"),  encoding="UTF-8")
# ------ main ------
dummy <- GetConfigText()
dummy <- GetREnviron()
downloads_path <- GetFolderPath("Downloads")
