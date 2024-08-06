#' title
#' 事前調査
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(jsonlite)
# ------ constants ------
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
homeDir <- GetHomeDir()
inputDir <- homeDir |> file.path("Documents\\GitHub\\ptosh-json-to-excel\\input_gpower")
inputJson <- inputDir |> list.files(full.names=T)
firstTrtJson <- inputJson |> str_extract("^.*/1st_trt_.*") |> na.omit() |> map( ~ jsonlite::fromJSON(.))
fieldItems <- firstTrtJson |> map( ~ .$field_items)
fieldItemsExcludeFlipFlops <- fieldItems |> map( ~ {
  temp <- .
  temp$flip_flops <- NULL
  temp$id <- NULL
  temp$sheet_id <- NULL
  return(temp)
})
for (i in 2:length(fieldItemsExcludeFlipFlops)) {
  test <- identical(fieldItemsExcludeFlipFlops[[i - 1]], fieldItemsExcludeFlipFlops[[i]])
  print(test)
}
