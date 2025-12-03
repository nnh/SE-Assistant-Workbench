rm(list = ls())
library(tidyverse)
library(openxlsx)
library(jsonlite)
library(googlesheets4)
config <- fromJSON("config.json")
excelfile1_path <- "C:\\Users\\c0002691\\Downloads\\seassi\\seassi\\311device.xlsx"
excelfile2_path <- "C:\\Users\\c0002691\\Downloads\\seassi\\seassi\\OSアップデート(24H2)未対応端末.xlsx"
device311 <- read.xlsx(excelfile1_path, sheet = 1)
os_update <- read.xlsx(excelfile2_path, sheet = 1)
device311$ホスト名 <- device311$ホスト名 %>% tolower()
os_update$ホスト名 <- os_update$ホスト名 %>% tolower()
# OSアップデート未対応
device311_no_os_update <- device311 %>%
  inner_join(os_update, by = c("ホスト名" = "ホスト名"))
device311_no_os_update$対応状況 <- "OSアップデート未対応"
# OSアップデート対応済
device311_os_update_done <- device311 %>%
  anti_join(os_update, by = c("ホスト名" = "ホスト名"))
device311_os_update_done$対応状況 <- "OSアップデート対応済"
# bind_rows
all_device311 <- device311_no_os_update %>%
  bind_rows(device311_os_update_done)
# PCキッティングシート
pc_kitting_sheet_raw <- read_sheet(config$pc_kitting_sheet_id, sheet = "本稼働分", skip = 1)
pc_kitting_sheet <- pc_kitting_sheet_raw %>%
  select(使用者,  HOSPnetホスト名, 機種名) %>% filter(!is.na(HOSPnetホスト名)) %>% filter(str_detect(`HOSPnetホスト名`, "311[a-zA-Z]4[a-zA-Z][0-9]{3}"))
# 資産管理シート
asset_management_sheet_raw <- read_sheet(config$asset_management_sheet_id, sheet = "機器一覧")
asset_management_sheet <- asset_management_sheet_raw %>% filter(str_detect(`名前`, "311[a-zA-Z]4[a-zA-Z][0-9]{3}"))
# PCキッティングシートに存在して、資産管理シートに存在しないホスト名
no_asset_management <- pc_kitting_sheet %>%
  anti_join(asset_management_sheet, by = c("HOSPnetホスト名" = "名前"))
no_asset_management$備考 <- "資産管理シートに未登録"
colnames(no_asset_management) <- c("使用者名", "名前", "機種名", "備考")
# 資産管理シートに存在して、PCキッティングシートに存在しないホスト名
no_pc_kitting <- asset_management_sheet %>%
  anti_join(pc_kitting_sheet, by = c("名前" = "HOSPnetホスト名"))
# 資産管理シートと、PCキッティングシートに存在して、資産管理シートに存在しないホスト名をbind_rows
target_devices <- asset_management_sheet %>% bind_rows(no_asset_management)
target_devices$forJoin <- target_devices$名前 %>% tolower()

device311_os_update <- target_devices %>% left_join(all_device311, by = c("forJoin" = "ホスト名"))
device311_os_update_final <- device311_os_update %>%
  filter(`対応状況` != "OSアップデート対応済" | is.na(`対応状況`)) %>% filter(`メーカー名` != "Apple")
sheet_write(device311_os_update_final, ss = config$output_sheet_id)
