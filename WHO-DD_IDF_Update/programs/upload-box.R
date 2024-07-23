#' Upload Files to Box
#' 
#' This script contains functions to upload IDF and WHODD files to Box. 
#' It checks if the respective files are present in the Downloads folder 
#' and performs the necessary operations to save them to Box.
#' 
#' @file upload-box.R
#' @author Mariko Ohtsuka
#' @date 2024.7.23
# ------ libraries ------
rm(list=ls())
library(here)
# ------ constants ------
# ------ functions ------
source(here("programs", "functions", "common.R"),  encoding="UTF-8")
SaveIdf <- function() {
  boxDirInfo <- SaveZipCommon(KIdfBoxDirName, kIdf)
  password <- readline(prompt="Enter IDF password: ")
  passwordFilePath <- file.path(downloads_path, str_c(file_list$idf$filename, kIdfPasswordFileFooter))
  writeLines(password, con = passwordFilePath)  
  box_ul(dir_id=boxDirInfo$zipId, passwordFilePath, pb=T)
}
# ------ main ------
file_list <- GetDownloadFiles()
if (length(file_list[[kWhoddZip]]) > 0) {
  SaveZipCommon(KWhoddBoxDirName, kWhoddZip)
}
if (kIdf %in% names(file_list)) {
  SaveIdf()
}
