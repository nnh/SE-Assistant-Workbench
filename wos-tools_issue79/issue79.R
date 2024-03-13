#' title
#' description
#' @file issue79.R
#' @author Mariko Ohtsuka
#' @date 2024.3.8
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(rvest)
library(jsonlite)
source(here("issue79_check_ad.R"), encoding="utf-8")
# ------ constants ------
kNhoString <- c("(?i)nho ", "(?i)natl hosp org", "(?i) nho,", "(?i)^nho,")
kParentPath <- "/Users/mariko/Library/CloudStorage/Box-Box/Projects/NHO 臨床研究支援部/英文論文/wos-tools/result/result_20240109174857"
# ------ functions ------
ReadDivIds <- function(html_file_path) {
  filename <- html_file_path |> basename()
  html_content <- html_file_path |> read_html()
  div_elements <- html_content |> html_nodes("div")
  ids <- div_elements |> html_attr("id")
  ids <- ids[!is.na(ids)]
  res <- ids |> map_df( ~ list(filename=filename, uid=.))
  return(res)
}
GetAddressSpec <- function(rec){
  addresses <- rec %>% map( ~ {
    uid <- .$UID
    if (.$static_data$fullrecord_metadata$addresses$count == 1) {
      address_spec <- list()
      address_spec[[1]] <- .$static_data$fullrecord_metadata$addresses$address_name$address_spec
    } else {
      address_spec <- .$static_data$fullrecord_metadata$addresses$address_name %>% map( ~ .$address_spec)
    }
    return(list(uid=uid, address_spec=address_spec))
  })
  return(addresses)
}
# ------ main ------
html_directory_path <- kParentPath |> file.path("html")
html_files <- html_directory_path |> list.files(pattern = "publication_20[0-9]{2}_[0-9]{2}\\.html$", full.names = TRUE)
html_uids <- html_files |> map_df( ~ ReadDivIds(.)) |> distinct()
json_directory_path <- kParentPath |> file.path("raw")
raw_json <- json_directory_path |> file.path("raw.json") |>　read_json()
rec <- raw_json |> map( ~ .$Data$Records$records$REC)
list_uid_and_address_spec <- rec |> map( ~ GetAddressSpec(.)) |> list_flatten()
# raw.jsonからHTMLに出力されているuidだけ抽出する
target_list_uid_and_address_spec <- list_uid_and_address_spec |> map( ~ {
  uid_address <- .
  target <- html_uids |> filter(uid == uid_address$uid)
  if (nrow(target) == 0) {
    return(NULL)
  }
  filename <- target$filename
  return(list(filename=filename, uid=uid_address$uid, address_spec=uid_address$address_spec))
}) |> keep( ~ !is.null(.))
# adに一人でもNHO職員がいればチェック対象外
check_nho_ad <- CheckAd(target_list_uid_and_address_spec)
check_ad_hosp_list <- CheckAd2(check_ad_hosp_list)
# raw.jsonからHTMLに出力されていないuidを抽出する
