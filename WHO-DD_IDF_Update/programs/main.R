#' title
#' description
#' @file main.R
#' @author Mariko Ohtsuka
#' @date 2024.7.19
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
# ------ constants ------
kIdf <- "idf"
kWhodd <- "whodd"
kWhoddZip <- "whoddZip"
kZipDirName <- "圧縮ファイル"
kZipExtention <- ".zip"
kIdfFileNameParts <- "(?i)^mtlt2[0-9]{5}"
kIdfFileNameString <- str_c(kIdfFileNameParts, ".*", kZipExtention, "$")
kWhoddJapanCrtParts <- "(?i)^WHODrug\\sJapan\\sCRT"
# ------ functions ------
source(here("programs", "common-functions.R"),  encoding="UTF-8")
source(here("programs", "s3-functions.R"),  encoding="UTF-8")
source(here("programs", "box-functions.R"),  encoding="UTF-8")
source(here("programs", "unzip-functions.R"),  encoding="UTF-8")
# ------ main ------
dummy <- GetConfigText()
dummy <- GetREnviron()
downloads_path <- GetFolderPath("Downloads")
file_list <- GetDownloadFiles()
# unzip WHO-DD
temp <- UnzipWhodd()
awsDirName <- temp$awsDirName
whoddUnzipDir <- temp$unzipDir
whoddDir <- "/WHODD/" %>% str_c(awsDirName, .)
# unzip IDF
temp <- UnzipIdf()
idfUnzipDir <- temp$unzipDir
idfPasswordFilePath <- temp$passwordFilePath
idfDir <- "/IDF/" %>% str_c(awsDirName, .)
# upload to s3.
copyTargetList = list(
  list(fromName="全件.txt", toName="data.txt", toDir=idfDir, fromDir=idfUnzipDir),
  list(fromName="英名＜可変長＞.txt", toName="full_en.txt", toDir=idfDir, fromDir=idfUnzipDir),
  list(fromName="全件＜可変長＞.txt", toName="full_ja.txt", toDir=idfDir, fromDir=idfUnzipDir),
  list(fromName="IDMapping.csv", toName="IDMapping.csv", toDir=whoddDir, fromDir=whoddUnzipDir),
  list(fromName="WHODDsGenericNames.csv", toName="WHODDsGenericNames.csv", toDir=whoddDir, fromDir=whoddUnzipDir)
)
copyFiles <- GetCopyFileInfo(copyTargetList)
UploadToS3(copyFiles)
# upload the zip file to Box.
SaveWhodd()
SaveIdf(idfPasswordFilePath)
