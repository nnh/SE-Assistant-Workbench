#' Upload extracted files (old versions) to BOX only
#'
#' This script downloads a WHO-DD/IDF pair and/or a MedDRA zip file by name from their existing
#' BOX storage folders (under kCodingDirId), unzips them, and uploads the extracted target files
#' to BOX (kBoxExtractedDirId). Files are not uploaded to S3.
#' Run programs/list-box-zip-files.R first to see available ZIP file names.
#'
#' @file upload-box-extracted.R
#' @author Mariko Ohtsuka
#' @date 2026.8.18
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
# ファイル名一覧は programs/list-box-zip-files.R で確認できる。
# IDFはWHO-DDのバージョンから自動判定するため、ファイル名の指定は不要。
whodd_zip_filename <- ""
meddra_zip_filename <- ""
# ------ main ------
whoddBoxDirInfo <- GetTargetDirInfo(KWhoddBoxDirName, kWhoddZip)
meddraBoxDirInfo <- GetTargetDirInfo(kMeddraBoxDirName, kMeddra)

# WHO-DD and IDF
if (nchar(whodd_zip_filename) > 0) {
  copyFiles <- GetWhoddIdfCopyFiles(whodd_zip_filename, whoddBoxDirInfo)
  UploadToBox(copyFiles, kBoxExtractedDirId)
}

# MedDRA
if (nchar(meddra_zip_filename) > 0) {
  copyFiles <- GetMeddraCopyFiles(meddra_zip_filename, meddraBoxDirInfo)
  UploadToBox(copyFiles, kBoxExtractedDirId)
}
