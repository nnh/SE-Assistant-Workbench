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
# --- main ---
config <- fromJSON("config.json")
target_result_folder <- config$parent_path %>% get_latest_result_folder()
raw_json <- file.path(target_result_folder, config$raw_dir_name, config$raw_json_name) %>% jsonlite::read_json()
rec <- raw_json %>% map(~ .$Data$Records$records$REC)
rec[1][[1]][[1]] %>% names()
View(rec[1][[1]][[1]])
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
sheet_write(
    data = publish_data,
    ss = config$spreadsheet_id,
    sheet = config$sheet_name
)
