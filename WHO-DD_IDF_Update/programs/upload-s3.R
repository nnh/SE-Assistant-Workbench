#' upload s3
#' 
#' @file upload-s3.R
#' @author Mariko Ohtsuka
#' @date 2024.7.22
# ------ libraries ------
rm(list=ls())
library(here)
# ------ constants ------
# ------ functions ------
source(here("programs", "functions", "common.R"),  encoding="UTF-8")
source(here("programs", "functions", "s3-functions.R"),  encoding="UTF-8")
source(here("programs", "functions", "unzip-functions.R"),  encoding="UTF-8")
source(here("programs", "functions", "whodd-idf-functions.R"),  encoding="UTF-8")
source(here("programs", "functions", "download-box.R"),  encoding="UTF-8")
# ------ main ------
dummy <- GetREnviron()
# download the ZIP file from BOX.
temp <- DownloadFilesFromBox()
whodd_zip <- temp$whodd
idf_zip <- temp$idf
idf_password <- temp$idfPassword
# unzip WHO-DD
temp <- whodd_zip |> UnzipWhodd()
awsDirName <- temp$awsDirName
whoddUnzipDir <- temp$unzipDir
whoddDir <- "/WHODD/" %>% str_c(awsDirName, .)
# unzip IDF
idfUnzipDir <- idf_zip |> UnzipIdf(awsDirName)
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
