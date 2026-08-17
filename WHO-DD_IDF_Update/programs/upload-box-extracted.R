#' Upload extracted files (old versions) to BOX only
#'
#' This script downloads a WHO-DD/IDF pair and/or a MedDRA zip file by name from their existing
#' BOX storage folders (under kCodingDirId), unzips them, and uploads the extracted target files
#' to BOX (kBoxExtractedDirId). Files are not uploaded to S3.
#'
#' @file upload-box-extracted.R
#' @author Mariko Ohtsuka
#' @date 2026.8.17
# ------ libraries ------
rm(list = ls())
library(here)
# ------ functions ------
source(here("programs", "functions", "common.R"), encoding = "UTF-8")
source(here("programs", "functions", "unzip-functions.R"), encoding = "UTF-8")
source(here("programs", "functions", "whodd-idf-functions.R"), encoding = "UTF-8")
source(here("programs", "functions", "download-box.R"), encoding = "UTF-8")
# ------ constants ------
# 対象とするZIPファイルのファイル名を指定する（kCodingDirId配下の圧縮ファイルフォルダにあるもの）。対象がない場合は空文字のままにする。
# IDFはWHO-DDのバージョンから自動判定するため、ファイル名の指定は不要。
whodd_zip_filename <- "WHODrug Japan CRT 2025 Sep 1.zip"
meddra_zip_filename <- ""
# ------ main ------
# 対象フォルダ内のZIPファイル一覧を表示する
whoddBoxDirInfo <- GetTargetDirInfo(KWhoddBoxDirName, kWhoddZip)
idfBoxDirInfo <- GetTargetDirInfo(KIdfBoxDirName, kIdf)
meddraBoxDirInfo <- GetTargetDirInfo(kMeddraBoxDirName, kMeddra)
cat(str_c(KWhoddBoxDirName, "/", kZipDirName, ":\n"))
PrintBoxZipFileNames(whoddBoxDirInfo$zipId)
cat(str_c(KIdfBoxDirName, "/", kZipDirName, ":\n"))
PrintBoxZipFileNames(idfBoxDirInfo$zipId, kIdfDisplayPattern)
cat(str_c(kMeddraBoxDirName, "/", kZipDirName, ":\n"))
PrintBoxZipFileNames(meddraBoxDirInfo$zipId)

# WHO-DD and IDF
if (nchar(whodd_zip_filename) > 0) {
  whodd_zip_path <- DownloadBoxFileByName(whoddBoxDirInfo$zipId, whodd_zip_filename)
  temp <- whodd_zip_path |> UnzipWhodd()
  whoddUnzipDir <- temp$unzipDir
  version <- temp$version
  unZipDirName <- temp$unZipDirName
  whoddBoxDir <- c(kAwsParentDirName, unZipDirName, "WHODD")

  idfVersion <- version
  targetIdfInfo <- GetIdfDownloadFilesInfoFromBox()
  for (i in 1:nrow(targetIdfInfo)) {
    idf_zip <- targetIdfInfo[i, "id", drop = T] |>
      flatten_chr() |>
      box_dl(downloads_path, overwrite = T)
    idf_password <- targetIdfInfo[i, "password", drop = T]
    temp <- UnzipIdf(idf_zip, idf_password)
    checkTargetYMD <- temp |> findFolder(str_c(idfVersion, "提供"))
    if (length(checkTargetYMD) > 0) {
      idfUnzipDir <- temp
      break
    }
  }
  if (!exists("idfUnzipDir")) {
    stop("対応するIDFファイルが見つかりません。")
  }
  idfBoxDir <- c(kAwsParentDirName, unZipDirName, "IDF")

  copyTargetList <- list(
    list(fromName = "全件.txt", toName = "data.txt", fromDir = idfUnzipDir, boxDir = idfBoxDir),
    list(fromName = "英名＜可変長＞.txt", toName = "full_en.txt", fromDir = idfUnzipDir, boxDir = idfBoxDir),
    list(fromName = "全件＜可変長＞.txt", toName = "full_ja.txt", fromDir = idfUnzipDir, boxDir = idfBoxDir),
    list(fromName = "IDMapping.csv", toName = "IDMapping.csv", fromDir = whoddUnzipDir, boxDir = whoddBoxDir),
    list(fromName = "WHODDsGenericNames.csv", toName = "WHODDsGenericNames.csv", fromDir = whoddUnzipDir, boxDir = whoddBoxDir),
    list(fromName = "Version.txt", toName = "Version.txt", fromDir = whoddUnzipDir, boxDir = whoddBoxDir)
  )
  copyFiles <- GetCopyFileInfo(copyTargetList)
  UploadToBox(copyFiles, kBoxExtractedDirId)
}

# MedDRA
if (nchar(meddra_zip_filename) > 0) {
  meddra_zip_path <- DownloadBoxFileByName(meddraBoxDirInfo$zipId, meddra_zip_filename)
  meddra_password <- GetBoxPasswordIfExists(meddraBoxDirInfo$zipId, meddra_zip_filename)
  temp <- UnzipMeddra(meddra_zip_path, meddra_password)
  unzipDir <- temp$unzipDir
  version <- temp$version
  meddraDir <- unzipDir |> list.dirs(full.names = T, recursive = F)
  asciiDir <- meddraDir |> file.path("ASCII")
  targetDir <- asciiDir |> list.dirs(full.names = T, recursive = F) |> str_extract("^.*_UTF8$") |> na.omit()
  targetFiles <- targetDir |> list.files(full.names = T)
  meddraBoxDir <- c(kMeddraBoxDirName, version)
  copyFiles <- targetFiles |> map( ~ {
    res <- list()
    res$path <- .
    res$filename <- basename(.)
    res$boxDir <- meddraBoxDir
    return(res)
  })
  UploadToBox(copyFiles, kBoxExtractedDirId)
}
