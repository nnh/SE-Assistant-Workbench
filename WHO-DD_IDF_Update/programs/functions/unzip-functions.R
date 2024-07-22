#' Title: Unzip Functions
#'
#' Description: This script contains functions to unzip files using 7-Zip, with and without a password.
#' @file unzip-functions.R
#' @author Mariko Ohtsuka
#' @date 2024.7.19
# ------ libraries ------
# ------ constants ------
Sys.setenv(PATH = paste(Sys.getenv("PATH"), "C:/Program Files/7-Zip", sep = ";"))
# ------ functions ------

#' Unzip a file using 7-Zip
#'
#' This function executes a system command to unzip a file using 7-Zip.
#' 
#' @param cmd The command string to execute.
#' @return None. The function prints the result of the unzipping process.
UnzipBy7z <- function(cmd) {
  result <- system(cmd, intern=T)
  cat(result, sep = "\n")
}

#' Execute unzipping of a file
#'
#' This function unzips a file to a specified directory using 7-Zip.
#' 
#' @param targetZipPath The path to the zip file.
#' @param unzipDir The directory to unzip the file to.
#' @return None.
ExecUnzip <- function(targetZipPath, unzipDir) {
  CreateDir(unzipDir)
  paste("7z x", shQuote(targetZipPath), paste0("-o", shQuote(unzipDir))) |> UnzipBy7z()
}

#' Execute unzipping of a file with a password
#'
#' This function unzips a file to a specified directory using 7-Zip, with a password prompt.
#' The password is saved to a text file.
#' 
#' @param targetZipPath The path to the zip file.
#' @param unzipDir The directory to unzip the file to.
#' @param password The password to unzip the file.
#' @return The path to the password text file.
ExecUnzipByPassword <- function(targetZipPath, unzipDir, password) {
  CreateDir(unzipDir)
  paste("7z x", shQuote(targetZipPath), paste0("-o", shQuote(unzipDir)), paste0("-p", shQuote(password))) |> UnzipBy7z()
  return()
}
