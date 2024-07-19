#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
# ------ libraries ------
# ------ constants ------
# ------ functions ------
#' Unzip IDF file
#'
#' This function unzips an IDF file using a password and returns the unzipped directory and password file path.
#' 
#' @return A list containing the unzipped directory and the password file path.
UnzipIdf <- function() {
  if (!kIdf %in% names(file_list)) {
    return()
  }
  unzipDir <- file.path(downloads_path, file_list[[kIdf]]$filename)
  passwordFilePath <- ExecUnzipByPassword(
    file_list[[kIdf]]$path, 
    file_list[[kIdf]]$filename, 
    unzipDir, 
    "Enter IDF password: "
  )
  return(list(unzipDir=unzipDir, passwordFilePath=passwordFilePath))
}
#' Unzip WHODD file
#'
#' This function unzips a WHODD file and returns the directory name and the unzipped directory path.
#' 
#' @return A list containing the AWS directory name and the unzipped directory path.
#' @importFrom stringr str_remove trimws
UnzipWhodd <- function() {
  if (!kWhodd %in% names(file_list)) {
    return(NA)
  }
  awsDirName <- file_list[[kWhodd]]$filename |> str_remove(kWhoddJapanCrtParts) |> trimws()
  temp_unzipDir <- file.path(downloads_path, "tempUnzipWhodd")
  ExecUnzip(file_list[[kWhodd]]$path, file_list[[kWhodd]]$filename, temp_unzipDir)
  whoddZipFilePath <- temp_unzipDir |> list.files(pattern="*.zip", full.names=T)
  unzipDir <- file.path(downloads_path, file_list[[kWhodd]]$filename)
  ExecUnzip(whoddZipFilePath, basename(whoddZipFilePath), unzipDir)
  return(list(awsDirName=awsDirName, unzipDir=unzipDir))
}
SaveIdf <- function(passwordFilePath) {
  boxDirInfo <- SaveZipCommon("IDF", kIdf)
  box_ul(dir_id=boxDirInfo$zipId, passwordFilePath, pb=T)
  return()
}
SaveWhodd <- function() {
  dummy <- SaveZipCommon("WHO-DD", kWhoddZip)
  return()
}
# ------ main ------