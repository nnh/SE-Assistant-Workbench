#' Title: BOX File Management
#'
#' Description: This script includes functions to interact with BOX directories and save zip files to specified folders in BOX.
#' @file box-file-management.R
#' @author Mariko Ohtsuka
#' @date 2024.7.19
# ------ libraries ------
library(boxr)
# ------ constants ------
# ------ functions ------
#' Get Target BOX Directory
#'
#' This function sets the working directory to a specified BOX directory ID and retrieves information about the directory's contents.
#' 
#' @param id The BOX directory ID.
#' @return A data frame containing information about the contents of the specified BOX directory.
GetTargetBoxDir <- function(id) {
  tryCatch({
    box_setwd(id)
  }, error = function(e) {
    stop(paste("Error: Unable dir id -", id, "\n", e$message))
  })
  dirInfo <- box_ls()
  # 空ディレクトリの場合は、後続のfilterでエラーにしないよう列を持つ空tibbleを返す
  if (length(dirInfo) == 0) {
    return(tibble(type = character(0), id = character(0), name = character(0)))
  }
  df_dirInfo <- dirInfo |> map( ~ c(type=.$type, id=.$id, name=.$name)) |>
    transpose() |>
    as_tibble()
  return(df_dirInfo)
}
#' Get Target Directory Information
#'
#' This function retrieves information about a target directory and its contents from BOX.
#' 
#' @param folderName The name of the target folder.
#' @return A list containing the ID and name of the target folder and its subdirectory.
GetTargetDirInfo <- function(folderName) {
  df_parentDirInfo <- GetTargetBoxDir(kCodingDirId)
  dirInfo <- df_parentDirInfo |> filter(type == "folder" & name == folderName)
  res <- list()
  if (nrow(dirInfo) == 0) {
    return(res)
  } else {
    res$id <- dirInfo[1, "id", drop=TRUE] |> flatten_chr()
    res$name <- dirInfo[1, "name", drop=TRUE] |> flatten_chr()
    df_zipDirInfo <- GetTargetBoxDir(res$id)
    zipDirInfo <- df_zipDirInfo |> filter(type == "folder" & name == kZipDirName)
    if (nrow(zipDirInfo) == 0) {
      box_dir_create(kZipDirName, res$id)
      df_zipDirInfo <- GetTargetBoxDir(res$id)
      zipDirInfo <- df_zipDirInfo |> filter(type == "folder" & name == kZipDirName)
    }
    res$zipId <- zipDirInfo[1, "id", drop=TRUE] |> flatten_chr()
    res$zipName <- zipDirInfo[1, "name", drop=TRUE] |> flatten_chr()
  }
  return(res)
}

#' Save Zip File to BOX
#'
#' This function saves a zip file to a specified folder in BOX.
#' 
#' @param folderName The name of the target folder in BOX.
#' @param listName The name of the list containing the file information.
#' @param file_list A list of files to upload (keyed by listName).
#' @return Information about the target directory in BOX where the file was saved.
SaveZipToBox <- function(folderName, listName, file_list) {
  if (!listName %in% names(file_list)) {
    return()
  }
  boxDirInfo <- GetTargetDirInfo(folderName)
  # 対象フォルダ(圧縮ファイルフォルダ)が見つからない場合は中断する
  if (is.null(boxDirInfo$zipId)) {
    stop(paste0("Error: Box上に対象フォルダが見つかりません: ", folderName))
  }
  if (ContainsNestedList(file_list[[listName]])) {
    zipList <- file_list[[listName]]
  } else {
    zipList <- file_list[[listName]] |> list()
  }
  zipList |> walk( ~ box_ul(dir_id=boxDirInfo$zipId, .$path, pb=TRUE))
  return(boxDirInfo)
}

BoxAuthSettings <- function() {
  # 貼り付け時の余分な空白・改行はinvalid_clientの原因になるためtrimする
  kBoxClientId <<- trimws(readline(prompt = "Enter BOX Client ID and press Enter: "))
  kBoxClientSecret <<- trimws(readline(prompt = "Enter BOX Client Secret and press Enter: "))
  # 空入力のまま認証するとinvalid_clientになるためチェックする
  if (kBoxClientId == "" || kBoxClientSecret == "") {
    stop("BOX Client ID/Secret が空です。再実行して入力してください。")
  }
}
BoxAuth <- function() {
  box_auth(client_id=kBoxClientId, client_secret=kBoxClientSecret)
}
