#' upload s3
#' 
#' @file upload-meddra-s3.R
#' @author Mariko Ohtsuka
#' @date 2024.9.30
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
asciiDir <- meddraDir |> file.path("ASCII")
targetDir <- asciiDir |> list.dirs(full.names=T, recursive=F) |> str_extract("^.*_UTF8$") |> na.omit()
targetFiles <- targetDir |> list.files(full.names=T)
aws_dir <- str_c(kMeddraAwsParentDirName, "/", version)
copyFiles <- targetFiles |> map( ~ {
  res <- list()
  res$path <- .
  res$filename <- basename(.)
  res$awsDir <- aws_dir
  return(res)
})
UploadToS3(copyFiles)
