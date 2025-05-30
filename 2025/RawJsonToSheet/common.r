rm(list = ls())
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
get_publish_data <- function(rec) {
    publish_data <- rec %>%
        map(~ {
            record <- .x
            record_list <- .x %>%
                map(~ {
                    uid <- .$UID
                    dynamic_data <- .$dynamic_data
                    cluster_related <- dynamic_data$cluster_related
                    identifiers <- cluster_related$identifiers$identifier
                    dynamic_data <- map_dfr(identifiers, as_tibble) %>%
                        group_by(type) %>%
                        summarise(value = paste(value, collapse = ", "), .groups = "drop") %>%
                        pivot_wider(names_from = type, values_from = value)
                    dynamic_data$UID <- uid
                    static_data <- .$static_data
                    summary <- static_data$summary
                    publishers <- summary$publishers$publisher$names$name %>% as_tibble()
                    publishers$UID <- uid
                    titles <- map_dfr(summary$titles$title, as_tibble) %>%
                        pivot_wider(names_from = type, values_from = content)
                    titles$UID <- uid
                    static_data <- inner_join(publishers, titles, by = "UID")
                    df <- inner_join(dynamic_data, static_data, by = "UID")
                    return(df)
                }) %>%
                bind_rows()
            return(record_list)
        }) %>%
        bind_rows()
    publish_data$pmid <- publish_data$pmid %>% str_remove_all("MEDLINE:")
    return(publish_data)
}
get_download_folder_path <- function() {
    user_profile <- Sys.getenv("USERPROFILE")
    if (user_profile == "") {
        stop("USERPROFILE 環境変数が取得できませんでした。")
    }
    download_path <- file.path(user_profile, "Downloads")
    return(normalizePath(download_path, winslash = "\\", mustWork = FALSE))
}
# --- main ---
config <- fromJSON("config.json")
hospitals <- fromJSON("hospitals.json")
