#' test script
#' 
#' @file test-meddra.R
#' @author Mariko Ohtsuka
#' @date 2024.8.8
rm(list=ls())
# ------ libraries ------
library(here)
source(here("programs", "functions", "common.R"),  encoding="UTF-8")
library(daff)
library("aws.s3")
# ------ constants ------
kTargetVer <- "27.0"
# ------ functions ------
DownloadAllS3Objects <- function(local_root) {
  objects <- get_bucket(bucket=kAwsBucketName, region=kAwsDefaultRegion)
  object_keys <- objects |> map_chr(~ .x$Key)
  
  object_keys |> walk(~ {
    local_file <- file.path(local_root, .x)
    cat("Attempting to download to:", local_file, "\n")  # デバッグメッセージ
    
    # ディレクトリの作成
    dir_name <- dirname(local_file)
    if (!dir.exists(dir_name)) {
      dir.create(dir_name, recursive=T)
    }
    
    tryCatch({
      if (!str_ends(.x, "/")) {
        save_object(object=.x, bucket=kAwsBucketName, file=local_file, region=kAwsDefaultRegion)
      }
    }, error = function(e) {
      message(sprintf("Failed to download %s: %s", .x, e$message))
      # エラーメッセージを追加で表示する
      traceback()
    })
  })
}


# ------ main ------
dummy <- GetREnviron()
testDir <- file.path(downloads_path,  "meddra-test")
downloadFromAwsDir <- file.path(testDir, "aws")
unlink(testDir, recursive=T)
CreateDir(testDir)
CreateDir(downloadFromAwsDir)
CreateDir(file.path(downloadFromAwsDir, kMeddraAwsParentDirName))
CreateDir(file.path(downloadFromAwsDir, kMeddraAwsParentDirName, kTargetVer))
object_key <- str_c(kMeddraAwsParentDirName, "/", kTargetVer)
DownloadAllS3Objects(downloadFromAwsDir)
