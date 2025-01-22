#' title
#' 
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
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
parentDir <- homeDir |> file.path("Documents\\GitHub\\ptosh-json-to-excel")
targetDirs <- parentDir |> list.dirs(recursive=F, full.names=T) |> str_extract("^.*/input_.+$") %>%
  ifelse(str_detect(., ".*/input_dummy$"), NA, .) |> na.omit()
test <- targetDirs |> map( ~ {
  dir_name <- str_extract(., "/input_.*$")
  filenames <- list.files(., full.names=T, pattern=".json")
  jsonFiles <- filenames |> map( ~ {
    json <- jsonlite::read_json(.)
    res <- list(category=json$category, alias_name=json$alias_name, filename=basename(.), dirname=dir_name)
    return(res)
  }) %>% bind_rows()
  return(jsonFiles)
}) %>% bind_rows()
visit <- test |> filter(category == "visit")
