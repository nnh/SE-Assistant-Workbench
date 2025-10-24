#' WHODD and IDF Unzip Functions
#' Description: This script includes functions to unzip IDF and WHODD files, and save them to Box.
#' @file whodd-idf-functions.R
#' @author Mariko Ohtsuka
#' @date 2025.10.24
# ------ functions ------
UnzipIdf <- function(input_zip_path, idf_password) {
  if (is.null(input_zip_path)) {
    return(NA)
  }
  unzipDir <- file.path(downloads_path, "tempUnzipIdf")
  if (!is.na(idf_password)) {
    passwordFilePath <- ExecUnzipByPassword(
      input_zip_path,
      unzipDir,
      idf_password
    )
  } else {
    passwordFilePath <- ExecUnzip(
      input_zip_path,
      unzipDir
    )
  }
  return(unzipDir)
}
UnzipWhodd <- function(input_zip_path) {
  if (is.null(input_zip_path)) {
    return(NA)
  }
  unZipDirName <- input_zip_path |>
    basename() |>
    str_remove(kWhoddJapanCrtParts) |>
    str_remove(kZipExtention) |>
    trimws()
  temp_unzipDir <- file.path(downloads_path, "tempUnzipWhodd")
  ExecUnzip(input_zip_path, temp_unzipDir)
  whoddZipFilePath <- temp_unzipDir |> list.files(pattern = "*.zip", full.names = T)
  unzipDir <- file.path(temp_unzipDir, unZipDirName)
  ExecUnzip(whoddZipFilePath, unzipDir)
  version <- basename(whoddZipFilePath) |>
    str_extract("ver\\d{8}") |>
    str_remove("ver")
  awsDirName <- unZipDirName %>% str_c(kAwsParentDirName, "/", .)
  return(list(awsDirName = awsDirName, unzipDir = unzipDir, version = version))
}
UnzipMeddra <- function(input_zip_path, meddra_password) {
  if (is.null(input_zip_path)) {
    return(NA)
  }
  temp_version <- basename(input_zip_path) |>
    str_extract(str_c("\\d+", kZipExtention)) |>
    str_remove(kZipExtention)
  version <- str_c(str_sub(temp_version, 1, 2), str_sub(temp_version, 3, -1), sep = ".")

  unzipDir <- file.path(downloads_path, "tempUnzipMeddra")
  #  ExecUnzip(input_zip_path, unzipDir)

  passwordFilePath <- ExecUnzipByPassword(
    input_zip_path,
    unzipDir,
    meddra_password
  )
  return(list(unzipDir = unzipDir, version = version))
}
