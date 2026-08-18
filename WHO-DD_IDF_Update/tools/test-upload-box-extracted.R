#' test script
#'
#' Downloads and unzips the specified WHO-DD/IDF pair and/or MedDRA zip, and shows what would be
#' uploaded to BOX (source path, destination folder, destination filename) via upload-box-extracted.R,
#' without actually uploading anything.
#'
#' Runs two test patterns in sequence when sourced:
#' - "normal": existing ZIP file names. Expects processing to succeed. Stops immediately if it fails.
#' - "error": non-existent ZIP file names. Expects DownloadBoxFileByName() to stop with an error.
#'
#' @file test-upload-box-extracted.R
#' @author Mariko Ohtsuka
#' @date 2026.8.18
rm(list = ls())
# ------ libraries ------
library(here)
source(here("programs", "functions", "common.R"), encoding = "UTF-8")
source(here("programs", "functions", "unzip-functions.R"), encoding = "UTF-8")
source(here("programs", "functions", "whodd-idf-functions.R"), encoding = "UTF-8")
source(here("programs", "functions", "download-box.R"), encoding = "UTF-8")
# ------ constants ------
kNormalWhoddZipFilename <- "WHODrug Japan CRT 2025 Mar 1.zip"
kNormalMeddraZipFilename <- "MEDDRAJ280.zip"
kErrorWhoddZipFilename <- "not_exist_whodd.zip"
kErrorMeddraZipFilename <- "not_exist_meddra.zip"
# ------ functions ------
PrintCopyFiles <- function(copyFiles) {
  copyFiles |> walk( ~ {
    boxPath <- str_c(str_c(.$boxDir, collapse = "/"), "/", .$filename)
    cat(str_c(.$path, " -> ", boxPath, " (exists: ", file.exists(.$path), ")\n"))
  })
}
#' Run a test case and check whether the result matches the pattern's expectation
#'
#' @param label A label for the test case, used in output messages.
#' @param expr A zero-argument function to run.
#' @param testPattern "normal" (expects success) or "error" (expects an error).
#' @return None. Prints "OK" on match, stops with "NG" on mismatch.
RunTest <- function(label, expr, testPattern) {
  result <- tryCatch(
    {
      expr()
      "success"
    },
    error = function(e) {
      cat(str_c(label, " error: ", conditionMessage(e), "\n"))
      "error"
    }
  )
  expected <- ifelse(testPattern == "normal", "success", "error")
  if (result == expected) {
    cat(str_c(label, ": OK (", result, ")\n"))
  } else {
    stop(str_c(label, ": NG - expected ", expected, " but got ", result))
  }
}
#' Run the WHO-DD/IDF and MedDRA test cases for a given pattern
#'
#' @param testPattern "normal" or "error".
#' @param whodd_zip_filename The WHO-DD zip file name to use for this pattern.
#' @param meddra_zip_filename The MedDRA zip file name to use for this pattern.
#' @return None.
RunPattern <- function(testPattern, whodd_zip_filename, meddra_zip_filename) {
  cat(str_c("=== ", testPattern, " pattern ===\n"))
  RunTest("WHO-DD/IDF", function() {
    copyFiles <- GetWhoddIdfCopyFiles(whodd_zip_filename, whoddBoxDirInfo)
    cat("WHO-DD/IDF:\n")
    PrintCopyFiles(copyFiles)
  }, testPattern)
  RunTest("MedDRA", function() {
    copyFiles <- GetMeddraCopyFiles(meddra_zip_filename, meddraBoxDirInfo)
    cat("MedDRA:\n")
    PrintCopyFiles(copyFiles)
  }, testPattern)
}
# ------ main ------
whoddBoxDirInfo <- GetTargetDirInfo(KWhoddBoxDirName, kWhoddZip)
meddraBoxDirInfo <- GetTargetDirInfo(kMeddraBoxDirName, kMeddra)

RunPattern("normal", kNormalWhoddZipFilename, kNormalMeddraZipFilename)
RunPattern("error", kErrorWhoddZipFilename, kErrorMeddraZipFilename)
