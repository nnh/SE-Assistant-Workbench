#' test script
#' 
#' @file test-meddra.R
#' @author Mariko Ohtsuka
#' @date 2024.10.1
rm(list=ls())
# ------ libraries ------
library(here)
source(here("programs", "functions", "common.R"),  encoding="UTF-8")
library(daff)
library(aws.s3)
library(jsonlite)
# ------ constants ------
versions <- here("ext", "version.json") |> read_json()
s3TargetDirName <- versions$version$MedDRA
# ------ functions ------
source(here("programs", "functions", "unzip-functions.R"),  encoding="UTF-8")
DownloadAllS3Objects <- function(local_root) {
  objects <- get_bucket(bucket=kAwsBucketName, region=kAwsDefaultRegion)
  raw_object_keys <- objects |> map_chr(~ .x$Key)
  object_keys <- raw_object_keys |> str_extract(str_c("^", kMeddraAwsParentDirName, "/", s3TargetDirName, ".*$")) %>% na.omit()
  object_keys |> walk(~ {
    local_file <- file.path(local_root, .x)
    cat("Attempting to download to:", local_file, "\n")  # デバッグメッセージ
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
    })
  })
}
CreateMeddraTestDir <- function(folderName) {
  downloadDir <- file.path(testDir, folderName)
  CreateDir(downloadDir)
  return(downloadDir)
}
GetHomeDir <- function() {
  os <- Sys.info()["sysname"]
  
  if (os == "Windows") {
    home_dir <- Sys.getenv("USERPROFILE")
  } else if (os == "Darwin") {
    home_dir <- Sys.getenv("HOME")
  } else {
    stop("Unsupported OS")
  }
  return (home_dir)
}

CompareFileSizes <- function(file1, file2) {
  # ファイルサイズを取得
  file1_size <- file.info(file1)$size
  file2_size <- file.info(file2)$size
  
  # ファイルサイズが同じかどうかを比較
  return(file1_size == file2_size)
}
GetFileSize <- function(file) {
  file1_size <- file.info(file)$size
  return(file1_size)
}
# ------ main ------
dummy <- GetREnviron()
homeDir <- GetHomeDir()
testDir <- file.path(downloads_path,  "meddra-test")
unlink(testDir, recursive=T)
CreateDir(testDir)
# box
boxDownloadDir <- "box" |> CreateMeddraTestDir()
boxZipFromDir <- file.path(homeDir, "\\Box\\References\\Coding\\MedDRA\\圧縮ファイル") 
temp <- boxZipFromDir |> list.files(pattern="zip") |> str_extract("MEDDRAJ[0-9]{3}\\.zip") |>
  str_extract("[0-9]{3}") |> as.numeric() |> max() |> as.character()
password_meddra <- file.path(boxZipFromDir, str_c("MEDDRAJ", temp, "_pw.txt")) |> read.delim(header=F) %>% .[1, 1, drop=T]
boxTargetVer <- str_c(str_sub(temp, 1, 2), ".", str_sub(temp, 3, 3))
boxZipFileName <- kMeddra |>toupper() %>% str_c("^.*\\", ., "J", str_remove(boxTargetVer, "\\."), kZipExtention, "$")
boxZipPath <- list.files(boxZipFromDir, full.names=T) |> str_extract(boxZipFileName) |> na.omit()
if (length(boxZipPath) != 1) {
  stop("box file download error.")
}
file.copy(boxZipPath, file.path(boxDownloadDir, basename(boxZipPath)))
boxUnzipDir <- file.path(boxDownloadDir, "test")
CreateDir(boxUnzipDir)
ExecUnzipByPassword(boxZipPath, boxDownloadDir, password_meddra)
# aws
downloadFromAwsDir <- "aws" |> CreateMeddraTestDir()
CreateDir(file.path(downloadFromAwsDir, kMeddraAwsParentDirName))
CreateDir(file.path(downloadFromAwsDir, kMeddraAwsParentDirName, s3TargetDirName))
object_key <- str_c(kMeddraAwsParentDirName, "/", s3TargetDirName)
DownloadAllS3Objects(downloadFromAwsDir)

# compare
## filename
awsTargetPath <- file.path(downloadFromAwsDir, kMeddraAwsParentDirName, s3TargetDirName)
awsFilenames <- list.files(awsTargetPath, recursive=T)
boxTargetPath <- file.path(boxDownloadDir, "MEDDRAJ", "ASCII") |> list.files(full.name=T) |> str_extract("^.*_UTF8") |> na.omit()
boxFilenames <- list.files(boxTargetPath, recursive=T)
if (identical(awsFilenames, boxFilenames)) {
  print("filecount ok.")
} else {
  stop("filecount error.")
}
## filesize
checkFileSize <- awsFilenames |> map_lgl( ~ CompareFileSizes(file.path(awsTargetPath, .), file.path(boxTargetPath, .)))
if (all(checkFileSize)) {
  print("filesize ok.")
} else {
  stop("filesize error.")
}

compareTargetExtentions <- c(".asc", ".seq")
targetFilenames <- awsFilenames |> map( ~ {
  filename <- .
  temp <- compareTargetExtentions |> map_lgl( ~ str_detect(filename, str_c("^.*", ., "$"))) |> any()
  if (temp) {
    if ((GetFileSize(file.path(awsTargetPath, filename))) > 0) {
      return(filename)
    } else {
      return(NULL)
    }
  } else {
    return(NULL)
  }
}) |> keep( ~ !is.null(.))
## File Identity Check
checkFileIdentity <- targetFilenames |> map_lgl( ~ {
  filename <- .
  file1 <- awsTargetPath |> file.path(filename) |> readLines(warn=F)
  file2 <- boxTargetPath |> file.path(filename) |> readLines(warn=F)
  return(identical(file1, file2))
})
if (all(checkFileIdentity)) {
  print("fileIdentity ok.")
} else {
  stop("fileIdentity error.")
}
