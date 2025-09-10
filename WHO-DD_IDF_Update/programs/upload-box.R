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
SaveZipWithPassword <- function(boxDirName, target) {
  boxDirInfo <- NULL
  tryCatch(
    {
      # SaveZipCommon 実行
      boxDirInfo <- SaveZipCommon(boxDirName, target)
    },
    error = function(e) {
      message("SaveZipCommon でエラー発生: ", e$message)
      boxDirInfo <<- NULL  # エラー時はNULLのまま
    },
    finally = {
      # パスワード入力とファイル保存は必ず実行
      password <- readline(prompt = str_c("Enter ", target, " password: "))
      passwordFilePath <- file.path(
        downloads_path,
        str_c(file_list[[target]]$filename, kIdfPasswordFileFooter)
      )
      writeLines(password, con = passwordFilePath)
      box_ul(dir_id = boxDirInfo$zipId, passwordFilePath, pb = TRUE)
    }
  )
}

# ------ main ------
file_list <- GetDownloadFiles()
if (kMeddra %in% names(file_list)) {
  SaveZipWithPassword(kMeddraBoxDirName, kMeddra)
}
if (length(file_list[[kWhoddZip]]) > 0) {
  SaveZipCommon(KWhoddBoxDirName, kWhoddZip)
}
if (kIdf %in% names(file_list)) {
  SaveZipWithPassword(KIdfBoxDirName, kIdf)
}
