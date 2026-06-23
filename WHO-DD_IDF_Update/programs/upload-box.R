#' Upload Files to Box
#'
#' This script contains functions to upload IDF and WHODD files to Box.
#' It checks if the respective files are present in the Downloads folder
#' and performs the necessary operations to save them to Box.
#'
#' @file upload-box.R
#' @author Mariko Ohtsuka
#' @date 2025.9.9
# ------ libraries ------
rm(list = ls())
library(here)
# ------ constants ------
# ------ functions ------
source(here("programs", "functions", "common.R"), encoding = "UTF-8")
SaveZipWithPassword <- function(boxDirName, target, file_list) {
  boxDirInfo <- NULL
  tryCatch(
    {
      # SaveZipToBox 実行
      boxDirInfo <- SaveZipToBox(boxDirName, target, file_list)
    },
    error = function(e) {
      message("SaveZipToBox でエラー発生: ", e$message)
    },
    finally = {
      # パスワード入力とローカル保存は失敗時でも必ず実行する
      password <- readline(prompt = str_c("Enter ", target, " password: "))
      passwordFilePath <- file.path(
        downloads_path,
        str_c(file_list[[target]]$filename, kIdfPasswordFileFooter)
      )
      writeLines(password, con = passwordFilePath)
      # zipアップロードが成功している(boxDirInfoが有効な)ときだけBoxへアップロードする
      if (!is.null(boxDirInfo)) {
        box_ul(dir_id = boxDirInfo$zipId, passwordFilePath, pb = TRUE)
      } else {
        message("zipのアップロードに失敗したため、パスワードファイルはローカルにのみ保存しました: ", passwordFilePath)
      }
    }
  )
}

# ------ main ------
# 設定・環境変数・Downloadsパスを初期化する
GetConfigText()
GetREnviron()
downloads_path <- GetFolderPath("Downloads")
file_list <- GetDownloadFiles()
if (kMeddra %in% names(file_list)) {
  SaveZipWithPassword(kMeddraBoxDirName, kMeddra, file_list)
}
# WHODDは大容量でboxrでアップロードできないため、programs/upload-whodd-box.Rで手動アップロードする
if (kIdf %in% names(file_list)) {
  SaveZipWithPassword(KIdfBoxDirName, kIdf, file_list)てst
}
