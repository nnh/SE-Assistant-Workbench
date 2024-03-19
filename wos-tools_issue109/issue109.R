#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(jsonlite)
# ------ constants ------
kTestConstants <- NULL
# ------ functions ------
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
rawJson <- "~/Library/CloudStorage/Box-Box/Projects/NHO 臨床研究支援部/英文論文/wos-tools/result/result_20240109174857/raw/raw.json" %>% read_json()
rec <- rawJson %>% map( ~ .$Data$Records$records$REC)
list_uid_and_address_spec <- rec %>% map( ~ GetAddressSpec(.)) %>% list_flatten()
list_japan <- list_uid_and_address_spec %>% map( ~ {
  temp <- .
  res <- temp$address_spec %>% map( ~ {
    if (str_detect(.$country, "(?i)Japan")){
      return(.)
    } else {
      return(list(country=NA))
    }
  }) %>% keep( ~ !is.na(.$country))
  return(list(uid=.$uid, address_spec=res))
})
ad <- list_japan %>% map( ~ {
  uid <- .$uid
  ad <- .$address_spec %>% map_df( ~ c(uid=uid, ad=.$full_address))
  return(ad)
}) %>% bind_rows()
oo <- list_japan %>% map_df( ~ {
  uid <- .$uid
  oo <- .$address_spec %>% map( ~ {
    organization <- .$organizations$organization %>% map_vec( ~ .$content)
  }) %>% unlist()
  return(list(uid=uid, oo=oo))
})
mito_med_ctr_ad <- ad %>% filter(str_detect(ad, "(?i)mito med ctr"))
mito_med_ctr_oo <- oo %>% filter(str_detect(oo, "(?i)mito med ctr"))
mito_med_ctr_uid <- bind_rows(mito_med_ctr_ad[, "uid", drop=F], mito_med_ctr_oo[, "uid", drop=F]) %>% distinct()
mito_med_ctr <- list_japan %>% map( ~ {
  target <- .
  check <- mito_med_ctr_uid %>% filter(uid == target$uid)
  if (nrow(check) > 0){
    return(target)
  } else {
    return(NULL)
  }
}) %>% keep( ~ !is.null(.))
test <- list()
row_count <- 0
for (i in 1:length(mito_med_ctr)){
  record <- mito_med_ctr[[i]]
  uid <- record$uid
  for (addr_count in 1:length(record$address_spec)){
    aaa <<- record
    addr_spec <- record$address_spec[[addr_count]]
    city <- addr_spec$city
    if (str_detect(addr_spec$full_address, "(?i)mito med ctr")){
      row_count <- row_count + 1
      test[[row_count]] <- list(uid=uid, city=addr_spec$city, ad=addr_spec$full_address, oo=NA)
    }
    organization <- addr_spec$organizations$organization
    if (!is.null(organization)){
      for (oo_count in 1:length(organization)){
        content <- organization[[oo_count]]$content
        if (str_detect(organization[[oo_count]]$content, "(?i)mito med ctr")){
          row_count <- row_count + 1
          test[[row_count]] <- list(uid=uid, city=addr_spec$city, ad=NA, oo=organization[[oo_count]]$content)
        }
      }
    }
  }
}
test2 <- test %>% map_df( ~ .)
nho_mito_med_ctr <- test2 %>% filter(str_detect(ad, "(?i)natl hosp org") | str_detect(oo, "(?i)natl hosp org"))
# nhoでcity:mitoのレコードを抽出する
city_mito_nho <- nho_mito_med_ctr %>% filter(str_detect(.$city, "(?i)mito")) %>% .$uid %>% unique()
# nho以外
no_nho_mito_med_ctr <- test2 %>% anti_join(nho_mito_med_ctr, by="uid")
# adの情報から病院名が特定できるレコードを削除
excluded_univTsukuba_nho <- no_nho_mito_med_ctr %>%
  filter(str_detect(.$ad, "(?i)univ Isukuba") |
         str_detect(.$ad, "(?i)tsukuba univ") |
         str_detect(.$ad, "(?i)univ tsukuba") |
         str_detect(.$ad, "(?i)mito kyodo gen hosp") |
         str_detect(.$ad, "3113193") |
         .$city == "Ibarakimachi" |
         .$city == "Higashiibaraki")
no_nho_mito_med_ctr_excluded <- no_nho_mito_med_ctr %>% anti_join(excluded_univTsukuba_nho, by="uid")
temp_ad <- no_nho_mito_med_ctr_excluded %>% select(uid, city, ad) %>% filter(!is.na(.$ad))
temp_oo <- no_nho_mito_med_ctr_excluded %>% select(uid, city, oo) %>% filter(!is.na(.$oo))
# ad, ooの情報から水戸医療センターか水戸協同病院か判断できないレコード
no_nho_mito_med_ctr_excluded <- temp_ad %>% full_join(temp_oo, by=c("uid", "city"))
# issue109で指摘があったレコードとそれ以外に分ける
issue109_uid <- data.frame(uid=c("WOS:001092684400002"))
rec_issue109 <- no_nho_mito_med_ctr_excluded %>% inner_join(issue109_uid, by="uid")
rec_exclueded_issue109 <- no_nho_mito_med_ctr_excluded %>% anti_join(issue109_uid, by="uid")
