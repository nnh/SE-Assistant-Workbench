#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
Sys.setenv(PATH = paste(Sys.getenv("PATH"), "C:/Program Files/7-Zip", sep = ";"))

library(tidyverse)
library(here)
library(boxr)
library("aws.s3")
### Box authenticate ###
#kClientId <- readline(prompt = "BOXのクライアントIDを入力してEnter: ")
#kClientSecret <- readline(prompt = "BOXのクライアントシークレットを入力してEnter: ")
#box_auth(client_id = kClientId, client_secret = kClientSecret)
### AWS authenticate ###
# ------ constants ------
kIdf <- "idf"
kWhodd <- "whodd"
kWhoddZip <- "whoddZip"
kZipDirName <- "圧縮ファイル"
kZipExtention <- ".zip"
# ------ functions ------
GetREnviron <- function() {
  home_dir <- GetHomeDir()
  renv_file <- file.path(home_dir, ".Renviron")
  
  # .Renviron ファイルの存在を確認
  if (!file.exists(renv_file)) {
    if (!exists("kAwsDefaultRegion")) {
      stop("Error: Please add 'kAwsDefaultRegion' to the config and re-run.")
    }
    cat(".Renviron file not found. Creating .Renviron file...\n")
    
    # ユーザーにAWS認証情報の入力を促す
    aws_key <- readline(prompt = "Enter your AWS access key ID: ")
    aws_secret <- readline(prompt = "Enter your AWS secret access key: ")
    
    # .Renviron ファイルにAWSの認証情報を書き込む
    writeLines(sprintf("AWS_ACCESS_KEY_ID=%s", aws_key), con = renv_file)
    cat(sprintf("AWS_SECRET_ACCESS_KEY=%s\n", aws_secret), file = renv_file, append = TRUE)
    cat(sprintf("AWS_DEFAULT_REGION=%s\n", kAwsDefaultRegion), file = renv_file, append = TRUE)

  }
  readRenviron(renv_file)
}
GetConfigText <- function() {
  configTextPath <- here("ext", "config.txt")
  configText <- tryCatch({
    read_csv(configTextPath, col_types = cols(
      .default = col_character()  # すべての列を文字列として読み込む
    ))
  }, error = function(e) {
    stop(paste("Error: Unable to read file -", configTextPath, "\n", e$message))
  })
  for (i in 1:nrow(configText)) {
    assign(configText[i, 1, drop=T], configText[i, 2, drop=T], envir = .GlobalEnv)
  }
  return()
}
GetTargetBoxDir <- function(id) {
  tryCatch({
    box_setwd(id)
  }, error = function(e) {
    stop(paste("Error: Unable dir id -", kCodingDirId, "\n", e$message))
  })
  dirInfo <- box_ls()
  df_dirInfo <- dirInfo |> map( ~ c(type=.$type, id=.$id, name=.$name)) |>
    map(~ unlist(.)) |>   # リストの各要素をベクトルに変換
    transpose() |>        # データフレームの列として変換
    as_tibble() 
  return(df_dirInfo)
}
GetTargetDirInfo <- function(folderName, listName) {
  df_parentDirInfo <- GetTargetBoxDir(kCodingDirId)
  dirInfo <- df_parentDirInfo |> filter(type == "folder" & name == folderName)
  res <- list()
  if (nrow(dirInfo) == 0) {
    return(res)
  } else {
    res$id <- dirInfo[1, "id", drop=T] |> flatten_chr()
    res$name <- dirInfo[1, "name", drop=T] |> flatten_chr()
    df_zipDirInfo <- GetTargetBoxDir(res$id)
    zipDirInfo <- df_zipDirInfo |> filter(type == "folder" & name == kZipDirName)
    if (nrow(zipDirInfo) == 0) {
      box_dir_create(kZipDirName, res$id)
      df_zipDirInfo <- GetTargetBoxDir(res$id)
      zipDirInfo <- df_zipDirInfo |> filter(type == "folder" & name == kZipDirName)
    }
    res$zipId <- zipDirInfo[1, "id", drop=T] |> flatten_chr()
    res$zipName <- zipDirInfo[1, "name", drop=T] |> flatten_chr()
  }
  return(res)
}
# 任意のフォルダのパスを取得する関数
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
GetFolderPath <- function(folder_name) {
  home_dir <- GetHomeDir()
  folder_path <- file.path(home_dir, folder_name)
  return(folder_path)
}
GetTargetFiles <- function(files, textPattern) {
  res <-  files |> str_extract(textPattern) |> na.omit()
  return(res)
}
GetTargetFilesList <- function(filename) {
  if (length(filename) == 0) {
    return(NULL)
  }
  res <- list(path=file.path(downloads_path, filename), filename=str_remove(filename, kZipExtention))
  return(res)
}
GetDownloadFiles <- function() {
  zipFiles <- downloads_path |> list.files(pattern=str_c("*", kZipExtention))
  whodd <- zipFiles |> GetTargetFiles(str_c("(?i)^WHODrug\\sJapan\\sCRT.*", kZipExtention, "$"))
  whoddZip <- zipFiles |> GetTargetFiles(str_c("(?i)^WHODrug\\s.*", kZipExtention ,"$"))
  idf <- zipFiles |> GetTargetFiles(str_c("(?i)^mtlt2[0-9]{5}.*", kZipExtention, "$"))
  if (length(whodd) > 1) {
    stop("Error: Multiple WHODrug zip files found. Please ensure that only one WHODrug zip file is present in the specified directory.")
  }
  if (length(idf) > 1) {
    stop("Error: Multiple idf zip files found. Please ensure that only one idf zip file is present in the specified directory.")
  }
  res <- list()
  res[[kIdf]] <- idf |> GetTargetFilesList()
  res[[kWhodd]] <- whodd |> GetTargetFilesList()
  res[[kWhoddZip]] <- whoddZip |> map( ~ GetTargetFilesList(.))
  return(res)
}
ExecUnzip <- function(targetZipPath, wkDirName, unzipDir) {
  targetZipPath |> unzip(overwrite=T, exdir=unzipDir)
  return(unzipDir)
}
# ------ main ------
dummy <- GetConfigText()
dummy <- GetREnviron()
downloads_path <- GetFolderPath("Downloads")
file_list <- GetDownloadFiles()
if (kWhoddZip %in% names(file_list)) {
  whoddBoxDirInfo <- GetTargetDirInfo("WHO-DD", kMeddra)
  if (length(whoddBoxDirInfo) > 0) {
    zipList <- file_list[[kWhoddZip]]
    dummy <- zipList |> map( ~ box_ul(dir_id=whoddBoxDirInfo$zipId, .$path, pb=T))
  }
}  
if (kWhodd %in% names(file_list)) {
  tempWhoddPath <- ExecUnzip(file_list$whodd$path, file_list$whodd$filename, file.path(dirname(file_list$whodd$path), "tempWhodd"))
  whoddUnzipPath <- file.path(downloads_path, file_list$whodd$filename)
  if (!dir.exists(whoddUnzipPath)) {
    dir.create(whoddUnzipPath, recursive=F)
  }
  whoddZipFilePath <- tempWhoddPath |> list.files(pattern="*.zip", full.names=T)
  dummy <- ExecUnzip(whoddZipFilePath, basename(whoddZipFilePath), file.path(whoddUnzipPath, str_remove(basename(whoddZipFilePath), kZipExtention)))
}
# whodd
# 1passwordにあるWHO-DDのサイトにログインしたあと、メールにあるダウンロードリンクをクリックすると、ダウンロードファイルのページ遷移できる。ダウンロードフォルダにファイル落とす。のところまでは手動
## \Box\References\Coding\WHO-DDにデータを格納し→
## S3にデータ格納し→
# チャットにてISRに通知する。→手動
# meddra
# 研究管理室のグループアドレスに最新版リリースの情報が届く。研究管理室からメール転送されてきたら、サイトよりデータをダウンロードして、までは手動
## \Box\References\Coding\MedDRAにデータを格納し、
#チャットにてISRに通知する。→手動
zip_file <- "C:/Users/MarikoOhtsuka/Downloads/mtlt202310+「医可変」「英名」「英名可変」.zip"
output_dir <- "C:/Users/MarikoOhtsuka/Downloads/MEDDRAJ270_test"

# 出力ディレクトリが存在する場合、それを削除して再度作成
if (dir.exists(output_dir)) {
  unlink(output_dir, recursive = TRUE)
}
dir.create(output_dir)

password <- ""
# コマンドの実行と出力のキャプチャ
cmd <- paste("7z x", shQuote(zip_file), paste0("-o", shQuote(output_dir)), paste0("-p", shQuote(password)))
result <- system(cmd, intern = TRUE)

# エラーメッセージの表示
cat(result, sep = "\n")