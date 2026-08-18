#' List ZIP files available in BOX for WHO-DD/IDF/MedDRA
#'
#' This script lists the ZIP (and password) file names available under each of the WHO-DD, IDF,
#' and MedDRA BOX storage folders (kCodingDirId configured folders). Use this to decide which
#' file names to set in upload-box-extracted.R / tools/test-upload-box-extracted.R.
#'
#' @file list-box-zip-files.R
#' @author Mariko Ohtsuka
#' @date 2026.8.18
# ------ libraries ------
rm(list = ls())
library(here)
# ------ functions ------
source(here("programs", "functions", "common.R"), encoding = "UTF-8")
# ------ main ------
whoddBoxDirInfo <- GetTargetDirInfo(KWhoddBoxDirName, kWhoddZip)
idfBoxDirInfo <- GetTargetDirInfo(KIdfBoxDirName, kIdf)
meddraBoxDirInfo <- GetTargetDirInfo(kMeddraBoxDirName, kMeddra)
cat(str_c(KWhoddBoxDirName, "/", kZipDirName, ":\n"))
PrintBoxZipFileNames(whoddBoxDirInfo$zipId)
cat(str_c(KIdfBoxDirName, "/", kZipDirName, ":\n"))
PrintBoxZipFileNames(idfBoxDirInfo$zipId, kIdfDisplayPattern)
cat(str_c(kMeddraBoxDirName, "/", kZipDirName, ":\n"))
PrintBoxZipFileNames(meddraBoxDirInfo$zipId)
