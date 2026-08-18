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
  return(list(awsDirName = awsDirName, unzipDir = unzipDir, version = version, unZipDirName = unZipDirName))
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
  if (!is.na(meddra_password)) {
    passwordFilePath <- ExecUnzipByPassword(
      input_zip_path,
      unzipDir,
      meddra_password
    )
  } else {
    passwordFilePath <- ExecUnzip(
      input_zip_path,
      unzipDir
    )
  }
  return(list(unzipDir = unzipDir, version = version))
}

#' Find the IDF unzip directory matching a given WHO-DD version
#'
#' This function downloads and unzips candidate IDF ZIPs from BOX until it finds one containing
#' a folder named "<version>提供", indicating it corresponds to the given WHO-DD version.
#'
#' @param version The WHO-DD version (8-digit date string) to match against.
#' @return The path to the matching unzipped IDF directory.
FindMatchingIdfUnzipDir <- function(version) {
  targetIdfInfo <- GetIdfDownloadFilesInfoFromBox(version)
  for (i in 1:nrow(targetIdfInfo)) {
    idf_zip <- targetIdfInfo[i, "id", drop = T] |>
      flatten_chr() |>
      box_dl(downloads_path, overwrite = T)
    idf_password <- targetIdfInfo[i, "password", drop = T]
    temp <- UnzipIdf(idf_zip, idf_password)
    checkTargetYMD <- temp |> findFolder(str_c(version, "提供"))
    if (length(checkTargetYMD) > 0) {
      return(temp)
    }
  }
  stop("対応するIDFファイルが見つかりません。")
}

#' Build the copy target list for WHO-DD and IDF extracted files
#'
#' This function builds the target list describing which extracted WHO-DD and IDF files to copy,
#' their renamed target names, and their S3/BOX destination directories.
#'
#' @param idfUnzipDir The unzipped IDF directory.
#' @param whoddUnzipDir The unzipped WHO-DD directory.
#' @param idfBoxDir The BOX destination folder path (character vector) for IDF files.
#' @param whoddBoxDir The BOX destination folder path (character vector) for WHO-DD files.
#' @param idfDir The S3 destination prefix for IDF files, or NULL if not uploading to S3.
#' @param whoddDir The S3 destination prefix for WHO-DD files, or NULL if not uploading to S3.
#' @return A list suitable for GetCopyFileInfo().
BuildWhoddIdfCopyTargetList <- function(idfUnzipDir, whoddUnzipDir, idfBoxDir, whoddBoxDir, idfDir = NULL, whoddDir = NULL) {
  list(
    list(fromName = "全件.txt", toName = "data.txt", toDir = idfDir, fromDir = idfUnzipDir, boxDir = idfBoxDir),
    list(fromName = "英名＜可変長＞.txt", toName = "full_en.txt", toDir = idfDir, fromDir = idfUnzipDir, boxDir = idfBoxDir),
    list(fromName = "全件＜可変長＞.txt", toName = "full_ja.txt", toDir = idfDir, fromDir = idfUnzipDir, boxDir = idfBoxDir),
    list(fromName = "IDMapping.csv", toName = "IDMapping.csv", toDir = whoddDir, fromDir = whoddUnzipDir, boxDir = whoddBoxDir),
    list(fromName = "WHODDsGenericNames.csv", toName = "WHODDsGenericNames.csv", toDir = whoddDir, fromDir = whoddUnzipDir, boxDir = whoddBoxDir),
    list(fromName = "Version.txt", toName = "Version.txt", toDir = whoddDir, fromDir = whoddUnzipDir, boxDir = whoddBoxDir)
  )
}

#' Get MedDRA target files from an unzipped MedDRA directory
#'
#' This function locates the ASCII/*_UTF8 files within an unzipped MedDRA directory.
#'
#' @param unzipDir The unzipped MedDRA directory.
#' @return A character vector of full file paths.
GetMeddraTargetFiles <- function(unzipDir) {
  meddraDir <- unzipDir |> list.dirs(full.names = T, recursive = F)
  asciiDir <- meddraDir |> file.path("ASCII")
  targetDir <- asciiDir |> list.dirs(full.names = T, recursive = F) |> str_extract("^.*_UTF8$") |> na.omit()
  targetFiles <- targetDir |> list.files(full.names = T)
  return(targetFiles)
}

#' Build the copyFiles list for MedDRA target files
#'
#' @param targetFiles A character vector of file paths (from GetMeddraTargetFiles()).
#' @param boxDir The BOX destination folder path (character vector).
#' @param awsDir The S3 destination prefix, or NULL if not uploading to S3.
#' @return A list suitable for UploadToS3()/UploadToBox().
BuildMeddraCopyFiles <- function(targetFiles, boxDir, awsDir = NULL) {
  targetFiles |> map( ~ {
    res <- list()
    res$path <- .
    res$filename <- basename(.)
    res$awsDir <- awsDir
    res$boxDir <- boxDir
    return(res)
  })
}

#' Download and unzip a WHO-DD/IDF pair by name, and build the copyFiles list for BOX upload
#'
#' This function downloads the given WHO-DD zip from BOX, finds the matching IDF zip, unzips both,
#' and builds the copyFiles list (source path, target filename, BOX destination folder) for the
#' extracted target files, without uploading anything.
#'
#' @param whodd_zip_filename The WHO-DD zip file name to download (from whoddBoxDirInfo's folder).
#' @param whoddBoxDirInfo The BOX directory info for the WHO-DD zip storage folder (from GetTargetDirInfo()).
#' @return A list suitable for UploadToBox()/UploadToS3().
GetWhoddIdfCopyFiles <- function(whodd_zip_filename, whoddBoxDirInfo) {
  whodd_zip_path <- DownloadBoxFileByName(whoddBoxDirInfo$zipId, whodd_zip_filename)
  temp <- whodd_zip_path |> UnzipWhodd()
  whoddUnzipDir <- temp$unzipDir
  version <- temp$version
  unZipDirName <- temp$unZipDirName
  whoddBoxDir <- c(kAwsParentDirName, unZipDirName, "WHODD")

  idfUnzipDir <- version |> FindMatchingIdfUnzipDir()
  idfBoxDir <- c(kAwsParentDirName, unZipDirName, "IDF")

  copyTargetList <- BuildWhoddIdfCopyTargetList(idfUnzipDir, whoddUnzipDir, idfBoxDir, whoddBoxDir)
  copyFiles <- GetCopyFileInfo(copyTargetList)
  return(copyFiles)
}

#' Download and unzip a MedDRA zip by name, and build the copyFiles list for BOX upload
#'
#' This function downloads the given MedDRA zip from BOX (using its password file if one exists),
#' unzips it, and builds the copyFiles list (source path, target filename, BOX destination folder)
#' for the extracted target files, without uploading anything.
#'
#' @param meddra_zip_filename The MedDRA zip file name to download (from meddraBoxDirInfo's folder).
#' @param meddraBoxDirInfo The BOX directory info for the MedDRA zip storage folder (from GetTargetDirInfo()).
#' @return A list suitable for UploadToBox()/UploadToS3().
GetMeddraCopyFiles <- function(meddra_zip_filename, meddraBoxDirInfo) {
  meddra_zip_path <- DownloadBoxFileByName(meddraBoxDirInfo$zipId, meddra_zip_filename)
  meddra_password <- GetBoxPasswordIfExists(meddraBoxDirInfo$zipId, meddra_zip_filename)
  temp <- UnzipMeddra(meddra_zip_path, meddra_password)
  unzipDir <- temp$unzipDir
  version <- temp$version
  targetFiles <- GetMeddraTargetFiles(unzipDir)
  meddraBoxDir <- c(kMeddraBoxDirName, version)
  copyFiles <- BuildMeddraCopyFiles(targetFiles, meddraBoxDir)
  return(copyFiles)
}
