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
source(here("issue79_non_output.R"), encoding="utf-8")
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
GetDoctype <- function(rec){
  doctypes <- rec %>% map( ~ {
    uid <- .$UID
    doctype <- .$static_data$summary$doctypes$doctype
    return(list(uid=uid, doctype=doctype))
  })
  return(doctypes)
}
# ------ main ------
html_directory_path <- kParentPath |> file.path("html")
html_files <- html_directory_path |> list.files(pattern = "publication_20[0-9]{2}_[0-9]{2}\\.html$", full.names = TRUE)
html_uids <- html_files |> map_df( ~ ReadDivIds(.)) |> distinct()
json_directory_path <- kParentPath |> file.path("raw")
raw_json <- json_directory_path |> file.path("raw.json") |>　read_json()
all_papers_json <- json_directory_path |> file.path("all_papers.json") |>　read_json()
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
# HTMLファイルに出力されている、NHO職員が一人もいない可能性のある論文リスト
check_ad_hosp_list <- CheckAd2(check_ad_hosp_list)
# HTMLファイルに出力されている、NHO職員が存在する可能性のある論文リスト
check_non_output_uids <- getNonOutput()
df_non_output_uids_ad_sortdate <- check_non_output_uids %>% map_df( ~ {
  uid <- .$uid
  doctype <- .$doctype
  sortdate <- .$sortdate
  ad <- .$address_spec %>% map_vec( ~ .$full_address)
  res <- list(uid=uid, ad=ad, doctype=doctype, sortdate=sortdate)
  return(res)
}) %>% distinct() %>% arrange(sortdate, uid)
df_non_output_uids <- df_non_output_uids_ad_sortdate %>% select(uid) %>% distinct()
# all_paper.jsonに存在するか
all_papers_json_uid <- all_papers_json %>% map_vec( ~ .$uid) %>% data.frame(uid=.)
exist_all_papers_uid <- df_non_output_uids %>% inner_join(all_papers_json_uid, by="uid")
non_exist_all_papers_uid <- df_non_output_uids %>% anti_join(all_papers_json_uid,  by="uid")
