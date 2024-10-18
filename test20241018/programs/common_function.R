#' functions for data analysis
#' 
#' @file common_function.R
#' @author Mariko Ohtsuka
#' @date 2024.10.18
# ------ libraries ------
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

#' Get Raw Data from JSON File
#'
#' This function reads a JSON file from a specified input path, extracts the records, 
#' and returns a flattened list of records. 
#'
#' @param kInputPath A string representing the path to the input JSON file, relative to the user's home directory.
#' @return A list containing the flattened records from the JSON file.
#' @importFrom purrr map list_flatten
#' @importFrom jsonlite read_json
#' @examples
#' # Assuming the input JSON file exists at "data/raw.json"
#' raw_data <- GetRawData("data/raw.json")
GetRawData <- function(kInputPath) {
  rawJson <- kInputPath |> read_json()
  rec <- rawJson |>
    map(~ .$Data$Records$records$REC) |>
    list_flatten()
  names(rec) <- rec |> map_chr( ~ .$UID)
  return(rec)
}

GetAddresses <- function(input_list) {
  addresses <- input_list |> map( ~ list(uid=.$UID, addresses=.$static_data$fullrecord_metadata$addresses))
  return(addresses)
}

ExportToGlobal <- function(input_list) {
  dummy <- names(input_list) |> map(~ assign(., input_list[[.]], envir = globalenv()))
}

# ------ main ------
