# --- libraries ---
library(readxl)
library(tidyverse)
library(googlesheets4)
library(jsonlite)
library(here)
# --- functions ---
SaveSpreadsheetId <- function(spreadsheet_id, file_path = "config.json") {
    spreadsheet_info <- list(spreadsheet_id = spreadsheet_id)
    write_json(spreadsheet_info, file_path, pretty = TRUE)
}
# --- main ---
config_path <- here("2025", "wos-tools_issue121", "config.json")
if (!file.exists(config_path)) {
    stop("Error: Config file not found at the specified path.")
}
config <- read_json(config_path)
spreadsheet_id <- config$spreadsheet_id
if (is.null(spreadsheet_id) || spreadsheet_id == "") {
    stop("Error: 'spreadsheet_id' is missing or empty in the config file.")
}
# Define the path to the Downloads folder
downloads_folder <- file.path(Sys.getenv("USERPROFILE"), "Downloads")

# List all .xls files in the Downloads folder
xls_files <- list.files(path = downloads_folder, pattern = "\\.xls$", full.names = TRUE)

# Read all .xls files into a list
xls_data_list <- xls_files %>%
    map(~ {
        xlsfile <- read_excel(.x)
        res <- xlsfile %>% select(c("Authors", "Addresses", "UT (Unique WOS ID)", "Pubmed Id"))
        return(res)
    }) %>%
    bind_rows()

uid_addresses <- xls_data_list %>%
    select(c("UT (Unique WOS ID)", "Addresses")) %>%
    distinct() %>%
    rename(id = "UT (Unique WOS ID)", addr = "Addresses")
uid_addresses$addresses <- uid_addresses$addr %>%
    str_replace_all("; \\[", "| [")
df_uid_addresses <- uid_addresses %>%
    separate_rows(addresses, sep = "\\|") %>%
    select(c("id", "addresses"))
filter_uid_addresses <- df_uid_addresses %>%
    filter(str_detect(addresses, "(?i)NHO") |
        str_detect(addresses, "(?i)Natl Hosp Org") |
        str_detect(addresses, "(?i)National Hospital Organization"))

name_facility <- filter_uid_addresses$addresses %>%
    map(~ {
        addr <- .
        temp <- str_split_1(addr, "\\]")
        res <- list(name = str_remove(temp[1], "\\["), facility = temp[2])
        return(res)
    }) %>%
    bind_rows()
uid_name_facility <- uid_name_facility %>% bind_cols(name_facility)
output_values <- uid_name_facility %>%
    left_join(xls_data_list, by = c("id" = "UT (Unique WOS ID)")) %>%
    select(c("id", "Pubmed Id", "name", "facility"))
output_values$wos_url <- str_c("https://www.webofscience.com/wos/woscc/full-record/", output_values$id)
output_values$pubmed_url <- ifelse(is.na(output_values$`Pubmed Id`), "", str_c("https://pubmed.ncbi.nlm.nih.gov/", output_values$`Pubmed Id`))
# Authenticate and specify the Google Sheet
sheet_url <- str_c("https://docs.google.com/spreadsheets/d/", spreadsheet_id)

# Write the data to the Google Sheet
sheet_write(output_values, ss = sheet_url, sheet = "wosData")
