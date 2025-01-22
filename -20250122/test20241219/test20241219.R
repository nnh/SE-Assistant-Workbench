#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(openxlsx)
# ------ constants ------
# ------ main ------
raw_xlsx <- "C:\\Users\\MarikoOhtsuka\\Box\\Stat\\Trials\\JAGSE\\CS-17-Molecular_interim\\output\\QC\\CS-17-Molecular定期報告_20241206.xlsx" %>%
  openxlsx::readWorkbook(sheet=2)
checkXlsx <- filter(raw_xlsx, Table.2.登録患者情報カンジャジョウホウ == "561")
rawdataPath <- "C:\\Users\\MarikoOhtsuka\\Box\\Stat\\Trials\\JAGSE\\CS-17-Molecular_interim\\input\\rawdata"
raw_mh <- "MH.csv" %>%  file.path(rawdataPath, .) %>% read_csv()
raw_ds <- "DS.csv" %>%  file.path(rawdataPath, .) %>% read_csv() 
reg <- "CS-17_registration_241206_1043.csv" %>%  file.path(rawdataPath, .) %>% read_csv() %>% select("登録コード", cs17_subjid="症例登録番号")
reg_mol <- "CS-17-Molecular_registration_241206_1044.csv" %>%  file.path(rawdataPath, .) %>% read_csv() %>% select("登録コード", molecular_subjid="症例登録番号")
target_reg <- inner_join(reg, reg_mol, by="登録コード")
test <- target_reg %>% filter(molecular_subjid == "561")
targetId <- test$cs17_subjid %>% str_c("CS-17-", .)
mh <- raw_mh %>% filter(MHCAT=="PRIMARY DIAGNOSIS") %>% filter(USUBJID== targetId) %>% select(USUBJID,MHDTC)
ds <- raw_ds %>% filter(USUBJID== targetId) %>% filter(DSTERM== "DEATH")
print(ds$DSSTDTC)
print(mh$MHDTC)
