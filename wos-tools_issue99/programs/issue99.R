#' wos-tools issue99
#'
#' @file issue99.R
#' @author Mariko Ohtsuka
#' @date 2024.1.31
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(jsonlite)
library(openxlsx)
source(here("programs", "constants.R"), encoding ="utf-8")
# ------ main ------
rawJson <- "~/Library/CloudStorage/Box-Box/Projects/NHO 臨床研究支援部/英文論文/wos-tools/result/result_20240109174857/raw/raw.json" %>% read_json()
rec <- rawJson %>% map( ~ .$Data$Records$records$REC)
# Extract only fullrecord_metadata and UID
fullrecord_metadata_list <- rec %>% map( ~ {
  rec1 <- .
  rec2 <- rec1 %>% map( ~ list(uid=.$UID, fullrecord_metadata=.$static_data$fullrecord_metadata))
  return(rec2)
}) %>% list_flatten()
identifier <- rec %>% map_df( ~ {
  rec1 <- .
  rec2 <- rec1 %>% map_df( ~ {
    identifier <- .$dynamic_data$cluster_related$identifiers$identifier %>% map_df( ~ as_tibble(.))
    identifier$uid <- .$UID
    return(identifier)
  })
  return(rec2)
})
esi <- here("input", "esi-master-journal-list-10-2023.xlsx") %>% openxlsx::read.xlsx()
UniqueISSN <- function(df_issn){
  df_duplicated <- df_issn[duplicated(df_issn$ISSN), "ISSN", drop=F] %>% inner_join(df_issn, by="ISSN")
  temp <- df_duplicated %>% group_by(ISSN) %>%
    summarize(Category.Name = paste(Category.Name, collapse = ", "))
  temp2 <- df_duplicated %>% select(ISSN, Full.title) %>% inner_join(temp, by="ISSN") %>% unique()
  df_no_duplicated <- df_issn %>% anti_join(df_duplicated, by="ISSN")
  res <- temp2 %>% bind_rows(df_no_duplicated)
  return(res)
}
esi_issn <- esi %>% filter(ISSN != "****-****" & !is.na(ISSN)) %>% select(c(Full.title, ISSN, Category.Name)) %>% UniqueISSN()
esi_eissn <- esi %>% filter(eISSN != "****-****" & !is.na(eISSN)) %>% select(c(Full.title, ISSN=eISSN, Category.Name)) %>% UniqueISSN()
issn <- identifier %>% filter(type == "issn") %>% left_join(esi_issn, by=c("value"="ISSN"))
eissn <- identifier %>% filter(type == "eissn") %>% left_join(esi_eissn, by=c("value"="ISSN"))
issn_eissn <- issn %>% bind_rows(eissn)
temp1_issn_eissn <- issn_eissn %>% filter(is.na(Category.Name))
temp2_issn_eissn <- issn_eissn %>% filter(!is.na(Category.Name))
temp2_issn_eissn$type <- NA
temp2_issn_eissn$value <- NA
temp2_issn_eissn <- temp2_issn_eissn %>% distinct()
unique_issn_eissn <- temp1_issn_eissn %>% bind_rows(temp2_issn_eissn) %>% arrange(uid)
# category_info
category_info_list <- fullrecord_metadata_list %>% map( ~ return(list(uid=.$uid, category_info=.$fullrecord_metadata$category_info)))
# subheadings
df_subheading <- ConvertListToDf(category_info_list, "subheadings", "subheading")
subheading_life_sciences_and_biomedicine <- df_subheading %>% filter(subheading == "Life Sciences & Biomedicine")
# subjects
subjects_list <- category_info_list %>% map( ~ return(list(uid=.$uid, subject=.$category_info$subjects$subject)))
df_subject_categories_classification <- subjects_list %>% CombineContent()
df_subject_wos_categories <- subjects_list %>% CombineContent("traditional")
df_subject_categories <- df_subject_categories_classification %>%
  inner_join(df_subject_wos_categories, by="uid")
# output
df_output <- subheading_life_sciences_and_biomedicine %>%
  left_join(df_subject_categories, by="uid") %>% right_join(unique_issn_eissn, by="uid") %>% arrange("uid")
wb <- createWorkbook()
addWorksheet(wb, "Sheet1")
writeData(wb, "Sheet1", df_output, startCol=1, startRow=1)
url <- str_c("https://www.webofscience.com/wos/woscc/full-record/", df_output$uid)
names(url) <- url
class(url) <- "hyperlink"
writeData(wb, "Sheet1", url, startCol=5, startRow=2)
writeData(wb, "Sheet1", c("url"), startCol=5, startRow=1)
saveWorkbook(wb, "~/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2023/20240131/wos-tools_issue99/issue99.xlsx", overwrite=T)
