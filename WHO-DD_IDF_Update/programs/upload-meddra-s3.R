#' upload s3
#' 
#' @file upload-meddra-s3.R
#' @author Mariko Ohtsuka
#' @date 2024.8.7
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
meddra_zip <- GetMeddraDownloadFilesInfoFromBox()
# unzip medDRA
temp <- meddra_zip |> UnzipMeddra()
unzipDir <- temp$unzipDir
version <- temp$version
if (!exists("unzipDir")) {
  stop("unzip error.")
}
meddraDir <- unzipDir|> list.dirs(full.names=T, recursive=F)
aws_dir <- str_c(kMeddraAwsParentDirName, "/", version)
UploadDirectoryToS3(meddraDir, aws_dir)
