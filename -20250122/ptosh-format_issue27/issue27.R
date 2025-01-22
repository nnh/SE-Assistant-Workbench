#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(labelled)
# ------ constants ------
input_path <- "C:/Users/MarikoOhtsuka/Documents/GitHub/ptosh-format/ptosh-format/r_ads_JSH-MM-15"
# ------ functions ------
GetHomeDir <- function() {
  os <- Sys.info()["sysname"]
  if (os == "Windows") {
    home_dir <- Sys.getenv("USERPROFILE")
  } else if (os == "Darwin") {
    home_dir <- Sys.getenv("HOME")
  } else {
    stop("Unsupported OS")
  }
  return (home_dir)
}
# ------ main ------
test1Filelist <- list.files(input_path, pattern="Rda", full.names=T)
load(test1Filelist[3])
load(test1Filelist[4])
