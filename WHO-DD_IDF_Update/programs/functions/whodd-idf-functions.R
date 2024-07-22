#' WHODD and IDF Unzip Functions
#' Description: This script includes functions to unzip IDF and WHODD files, and save them to Box.
#' @file whodd-idf-functions.R
#' @author Mariko Ohtsuka
#' @date 2024.7.22
# ------ functions ------
UnzipIdf <- function(input_zip_path, awsDirName) {
  if (is.null(input_zip_path)) {
    return(NA)
  }
  unzipDir <- file.path(downloads_path, "tempUnzipIdf")
  passwordFilePath <- ExecUnzipByPassword(
    input_zip_path, 
    unzipDir, 
    idf_password
  )
  return(unzipDir)
}
UnzipWhodd <- function(input_zip_path) {
  if (is.null(input_zip_path)) {
    return(NA)
  }
  awsDirName <- input_zip_path |> basename() |> str_remove(kWhoddJapanCrtParts) |> str_remove(kZipExtention) |> trimws()
  temp_unzipDir <- file.path(downloads_path, "tempUnzipWhodd")
  ExecUnzip(input_zip_path, temp_unzipDir)
  whoddZipFilePath <- temp_unzipDir |> list.files(pattern="*.zip", full.names=T)
  unzipDir <- file.path(temp_unzipDir, awsDirName)
  ExecUnzip(whoddZipFilePath, unzipDir)
  return(list(awsDirName=awsDirName, unzipDir=unzipDir))
}

