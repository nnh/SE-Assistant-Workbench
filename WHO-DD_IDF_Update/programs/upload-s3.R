#' upload s3
#'
#' @file upload-s3.R
#' @author Mariko Ohtsuka
#' @date 2025.9.26
# ------ libraries ------
rm(list = ls())
library(here)
# ------ constants ------
# ------ functions ------
source(here("programs", "functions", "common.R"), encoding = "UTF-8")
source(here("programs", "functions", "s3-functions.R"), encoding = "UTF-8")
source(here("programs", "functions", "unzip-functions.R"), encoding = "UTF-8")
source(here("programs", "functions", "whodd-idf-functions.R"), encoding = "UTF-8")
source(here("programs", "functions", "download-box.R"), encoding = "UTF-8")
# ------ main ------
# download the ZIP file from BOX.
whodd_zip <- whoddDownloadFilesFromBox()
# unzip WHO-DD
temp <- whodd_zip |> UnzipWhodd()
awsDirName <- temp$awsDirName
whoddUnzipDir <- temp$unzipDir
whoddDir <- "/WHODD/" %>% str_c(awsDirName, .)
unZipDirName <- temp$unZipDirName
version <- temp$version
# download and unzip idf
idfUnzipDir <- version |> FindMatchingIdfUnzipDir()
idfDir <- "/IDF/" %>% str_c(awsDirName, .)
# upload to s3 and box.
idfBoxDir <- c(kAwsParentDirName, unZipDirName, "IDF")
whoddBoxDir <- c(kAwsParentDirName, unZipDirName, "WHODD")
copyTargetList <- BuildWhoddIdfCopyTargetList(idfUnzipDir, whoddUnzipDir, idfBoxDir, whoddBoxDir, idfDir, whoddDir)
copyFiles <- GetCopyFileInfo(copyTargetList)
UploadToS3(copyFiles)
UploadToBox(copyFiles, kBoxExtractedDirId)
