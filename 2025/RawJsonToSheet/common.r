rm(ls = )
library(tidyverse)
library(jsonlite)
library(here)
library(googlesheets4)
# --- functions ---
get_latest_result_folder <- function(parent_path) {
    folders <- list.dirs(parent_path, full.names = TRUE, recursive = FALSE)
    pattern <- "^result_\\d{14}$"
    result_folders <- folders[grepl(pattern, basename(folders))]
    if (length(result_folders) == 0) {
        stop("No matching folders found.")
    }
    numbers <- as.numeric(sub("result_", "", basename(result_folders)))
    latest_folder <- result_folders[which.max(numbers)]
    return(latest_folder)
}
get_rec_from_raw_json <- function(raw_json) {
    rec <- raw_json %>% map(~ .$Data$Records$records$REC)
    return(rec)
}
get_raw_json <- function(config) {
    target_result_folder <- config$parent_path %>% get_latest_result_folder()
    raw_json_path <- file.path(target_result_folder, config$raw_dir_name, config$raw_json_name)
    raw_json <- jsonlite::read_json(raw_json_path)
    return(raw_json)
}
get_rec <- function(config) {
    raw_json <- get_raw_json(config)
    rec <- get_rec_from_raw_json(raw_json)
    return(rec)
}
get_html_files <- function(config) {
    target_result_folder <- config$parent_path %>% get_latest_result_folder()
    html_files_path <- file.path(target_result_folder, config$html_dir_name)
    html_files <- list.files(html_files_path, full.names = TRUE, pattern = "\\.html$")
    res <- html_files[str_detect(html_files, "publication_[0-9]{4}_[0-9]{2}\\.html$")]
    return(res)
}
# --- main ---
config <- fromJSON("config.json")
hospitals <- fromJSON("hospitals.json")
