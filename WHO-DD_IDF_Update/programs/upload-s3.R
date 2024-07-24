#' upload s3
#' 
#' @file upload-s3.R
#' @author Mariko Ohtsuka
#' @date 2024.7.24
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
# download the ZIP file from BOX.
whodd_zip <- whoddDownloadFilesFromBox()
# unzip WHO-DD
temp <- whodd_zip |> UnzipWhodd()
awsDirName <- temp$awsDirName
whoddUnzipDir <- temp$unzipDir
whoddDir <- "/WHODD/" %>% str_c(awsDirName, .)
# download and unzip idf
idfVersion <- temp$version
targetIdfInfo <- GetIdfDownloadFilesInfoFromBox()
for (i in 1:nrow(targetIdfInfo)) {
  idf_zip <- targetIdfInfo[i, "id", drop=T] |> flatten_chr() |> box_dl(downloads_path, overwrite=T)  
  idf_password <- targetIdfInfo[i, "password", drop=T]
  temp <- UnzipIdf(idf_zip, idf_password)
  checkTargetYMD <- temp |> findFolder(str_c(idfVersion, "提供"))
  if (length(checkTargetYMD) > 0) {
    idfUnzipDir <- temp
    idfDir <- "/IDF/" %>% str_c(awsDirName, .)
    break
  }
}
if (!exists("idfUnzipDir") | !exists("whoddUnzipDir")) {
  stop("unzip error.")
}
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
