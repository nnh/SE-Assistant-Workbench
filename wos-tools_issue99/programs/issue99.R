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
source(here("programs", "constants.R"), encoding ="utf-8")
# ------ main ------
rawJson <- here("input", "raw.json") %>% read_json()
rec <- rawJson %>% map( ~ .$Data$Records$records$REC)
# fullrecord_metadataとUIDだけを抽出する
fullrecord_metadata_list <- rec %>% map( ~ {
  rec1 <- .
  rec2 <- rec1 %>% map( ~ list(uid=.$UID, fullrecord_metadata=.$static_data$fullrecord_metadata))
  return(rec2)
}) %>% list_flatten()
# category_info
category_info_list <- fullrecord_metadata_list %>% map( ~ return(list(uid=.$uid, category_info=.$fullrecord_metadata$category_info)))
# headings
df_heading <- ConvertListToDf(category_info_list, "headings", "heading")
# subheadings
df_subheading <- ConvertListToDf(category_info_list, "subheadings", "subheading")
subheading <- df_subheading %>% left_join(kDfHeading, by=c("subheading"="heading"))
# subjects
subjects_list <- category_info_list %>% map( ~ return(list(uid=.$uid, subject=.$category_info$subjects$subject)))
df_subject <- map_dfr(subjects_list, ~ tibble(uid = .x$uid, content = map_chr(.x$subject, "content")))
subjects <- df_subject %>% left_join(kDfSubHeading, by=c("content"="subheading"))
