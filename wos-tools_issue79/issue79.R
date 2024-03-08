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
# ------ constants ------
kNhoString <- c("(?i)nho ", "(?i)natl hosp org", "(?i) nho,")
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
shizuoka_med_ctr <- list()
mie_natl_hosp <- list()
kure_med_ctr <- list()
hiroshima_nishi_med_ctr <- list()
shikoku_med_ctr <- list()
disaster_med_ctr <- list()
ureshino_med_ctr <- list()
asahikawa_med_ctr <- list()
shimoshizu_natl_hosp <- list()
kumamoto_med_ctr <- list()
yonago_med_ctr <- list()
nishitaga_hosp <- list()
shikoku_canc_ctr <- list()
mie_chuo_med_ctr <- list()
iwakuni_med_ctr <- list()
takasaki_gen_med_ctr <- list()
hokkaido_canc_ctr <- list()
nagoya_med_ctr <- list()
kinki_chuo_chest_med_ctr <- list()
okayama_med_ctr <- list()
mito_med_ctr <- list()
check_nho_ad <- target_list_uid_and_address_spec |> map( ~ {
  filename_uid_address <- .
  address <- filename_uid_address$address_spec
  for (i in 1:length(address)) {
    ad <- address[[i]]$full_address
    if (str_detect(ad, kNhoString[1]) | str_detect(ad, kNhoString[2]) | str_detect(ad, kNhoString[3])){
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)shizuoka med ctr")) {
      shizuoka_med_ctr <<- append(shizuoka_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)mie natl hosp") | str_detect(ad, "(?i)natl mie hosp")) {
      mie_natl_hosp <<- append(mie_natl_hosp, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)kure med ctr")) {
      kure_med_ctr <<- append(kure_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)hiroshima nishi med ctr")) {
      kure_med_ctr <<- append(kure_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Shikoku Med Ctr Children & Adults")){
      shikoku_med_ctr <<- append(shikoku_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Disaster med ctr")){
      disaster_med_ctr <<- append(disaster_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)ureshino med ctr")){
      ureshino_med_ctr <<- append(ureshino_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)asahikawa med ctr")){
      asahikawa_med_ctr <<- append(asahikawa_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Shimoshizu natl hosp")){
      shimoshizu_natl_hosp <<- append(shimoshizu_natl_hosp, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)kumamoto med ctr")){
      kumamoto_med_ctr <<- append(kumamoto_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)yonago med ctr")){
      yonago_med_ctr <<- append(yonago_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Sendai Nishitaga hosp")){
      nishitaga_hosp <<- append(nishitaga_hosp, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Shikoku canc ctr")){
      shikoku_canc_ctr <<- append(shikoku_canc_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Mie Chuo med ctr")){
      mie_chuo_med_ctr <<- append(mie_chuo_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Iwakuni clin ctr")){
      iwakuni_med_ctr <<- append(iwakuni_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Takasaki gen med ctr")){
      takasaki_gen_med_ctr <<- append(takasaki_gen_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Hokkaido canc ctr")){
      hokkaido_canc_ctr <<- append(hokkaido_canc_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Nagoya med ctr")){
      nagoya_med_ctr <<- append(nagoya_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Kinki Chuo Chest med ctr")){
      kinki_chuo_chest_med_ctr <<- append(kinki_chuo_chest_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)okayama med ctr")){
      okayama_med_ctr <<- append(okayama_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)Nishisaitama Chuo natl hosp")){
      nishisaitama_chuo_natl_hosp <<- append(nishisaitama_chuo_natl_hosp, list(filename_uid_address))
      address <- NULL
      break
    }
    if (str_detect(ad, "(?i)mito med ctr")){
      mito_med_ctr <<- append(mito_med_ctr, list(filename_uid_address))
      address <- NULL
      break
    }
  }
  if (is.null(address)) {
    return(NULL)
  }
  return(filename_uid_address)
}) %>% keep( ~ !is.null(.))
# ooに一人でもNHO職員がいればチェック対象外
check_nho_oo <- check_nho_ad |> map( ~ {
  filename_uid_address <- .
  address <- filename_uid_address$address_spec
  for (i in 1:length(address)) {
    organizations <- address[[i]]$organizations
    if (length(organizations) > 0){
      organization <- organizations$organization
      for (j in 1:length(organization)) {
        content <- organization[[j]]$content
        if (str_detect(content, kNhoString[1]) | str_detect(content, kNhoString[2]) | str_detect(content, kNhoString[3])){
          organizations <- NULL
          break
        }
      }
      if (is.null(organizations)){
        break
      }
    }
  }
  if (is.null(organizations)){
    return(NULL)
  }
  return(filename_uid_address)
})
