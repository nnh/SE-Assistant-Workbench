#' test script
#' 
#' @file test-main.R
#' @author Mariko Ohtsuka
#' @date 2024.7.22
# ------ libraries ------
library(here)
library(tidyverse)
# ------ constants ------
# ------ functions ------
source(here("programs", "functions", "box-functions.R"),  encoding="UTF-8")
GetTestTarget <- function(parentDirId, targetName) {
  targetList <- parentDirId |> box_ls()
  for (i in 1:length(targetList)) {
    target <- targetList[[i]]
    if (target$name == targetName) {
      id <- target$id
      return(id)
    }
  }
}
# ------ main ------
current_year <- Sys.Date() |> format("%Y") |> as.numeric()
current_month <- Sys.Date() |> format("%m") |> as.numeric()
whoddMonth <- ifelse(current_month >= 9 || current_month < 3,  "Sep", "Mar")
whoddYear <- ifelse(current_month >= 3, current_year, current_year - 1)
whoddFileName <- str_c("WHODrug Japan CRT ", whoddYear, " ", whoddMonth, " 1.zip")
codingDirList <- kCodingDirId |> box_ls()
for (i in 1:length(codingDirList)) {
  target <- codingDirList[[i]]
  if (target$name == KWhoddBoxDirName) {
    whoddDirId <- target$id
  }
  if (target$name == KIdfBoxDirName) {
    idfDirId <- target$id
  }
}
whoddZipId <- GetTestTarget(whoddDirId, kZipDirName)
idfZipId <- GetTestTarget(idfDirId, kZipDirName)
whoddFileId <- GetTestTarget(whoddZipId, whoddFileName)
