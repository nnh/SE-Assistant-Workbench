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
# ------ functions ------
rawJson <- "~/Library/CloudStorage/Box-Box/Projects/NHO 臨床研究支援部/英文論文/wos-tools/result/result_20240109174857/raw/raw.json" %>% read_json()
rec <- rawJson %>% map( ~ .$Data$Records$records$REC)
GetJsonByUid <- function(uid){
  for (i in 1:length(rec)){
    rec_group <- rec[[i]]
    for (j in 1:length(rec_group)){
      rec_record <- rec_group[[j]]
      if (rec_record$UID == uid){
        break
      } else {
        rec_record <- NULL
      }
    }
    if (!is.null(rec_record)){
      break
    }
  }
  return(rec_record)
}
# ------ main ------
test1 <- GetJsonByUid("WOS:001092684400002")
test2 <- GetJsonByUid("WOS:001082683100003")

test1_addresses <- test1$static_data$fullrecord_metadata$addresses$address_name %>% map( ~ .$address_spec) %>% list_flatten()
test2_addresses <- test2$static_data$fullrecord_metadata$addresses$address_name %>%
  map( ~ list(ad=.$address_spec$full_address, oo=.$address_spec$organizations))
