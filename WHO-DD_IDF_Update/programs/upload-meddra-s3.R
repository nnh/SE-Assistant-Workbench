#' upload s3
#' 
#' @file upload-meddra-s3.R
#' @author Mariko Ohtsuka
#' @date 2025.3.5
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
temp <- UnzipMeddra(meddra_zip$localPath, meddra_zip$password)
unzipDir <- temp$unzipDir
version <- temp$version
if (!exists("unzipDir")) {
  stop("unzip error.")
}
targetFiles <- GetMeddraTargetFiles(unzipDir)
aws_dir <- str_c(kMeddraAwsParentDirName, "/", version)
meddraBoxDir <- c(kMeddraBoxDirName, version)
copyFiles <- BuildMeddraCopyFiles(targetFiles, meddraBoxDir, aws_dir)
UploadToS3(copyFiles)
UploadToBox(copyFiles, kBoxExtractedDirId)
