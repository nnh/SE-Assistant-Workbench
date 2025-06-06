#' Scripts for data validation in wos-tools
#' 
#' @file wos-validator.R
#' @author Mariko Ohtsuka
#' @date 2024.10.11
rm(list=ls())
# ------ libraries ------
library(here)
library(tidyverse)
# ------ constants ------
kSpecifiedDate <- "20240901" |> as.POSIXct(specified_date, format = "%Y%m%d", tz = "UTC")
kParentPath <- "Box\\Projects\\NHO 臨床研究支援部\\英文論文\\wos-tools\\result\\result_20240925100939\\"
krawJsonPath <- str_c(kParentPath, "raw\\raw.json")
kAllPapersJsonPath <- str_c(kParentPath, "raw\\all_papers.json")
kHtmlPath <- str_c(kParentPath, "html\\")
# ------ functions ------
source(here("common_function.R"), encoding="UTF-8")
homeDir <- GetHomeDir()
source(here("getQuery.R"), encoding="UTF-8")
# ------ main ------
htmlWosIdList <- file.path(homeDir, kHtmlPath) |> GetPublicationsWosIds()
allPapers <- file.path(homeDir, kAllPapersJsonPath) |> read_json() |> map_df( ~ c(uid=.$uid, targetDate= gsub("-", "", substr(.$targetDate, 1, 7))))
# rawdataから出力対象と思われるデータとそれ以外のデータを取得する
rec <- file.path(homeDir, krawJsonPath) |> GetRawData()
temp <- rec |> GetAddresses()
addresses <- temp$addresses
allAddresses <- temp$allAddresses
# 一つでもNHO病院があればtargetに格納, それ以外はnontargetに格納
dummy <- allAddresses |> FilterTargetGroups() |> ExportToGlobal()
###############
### check 1 ###
###############
# nonTargetに出力されたデータにNHO病院の可能性のある施設名が入っていればcheckTargetHospNamesに格納
dummy <- nonTarget |> GetCheckTarget1() |> ExportToGlobal()
# checkTargetHospNamesの内容を確認、HTMLファイルにNHO病院の著者が存在しない可能性のあるレコードをhtmlOutputRecordsに格納
dummy <- checkTargetHospNames |> ExecCheckTarget1() |> ExportToGlobal()
###############
### check 2 ###
###############
# NHO病院でないと思われる病院の中で未知の名称のものをcheckTarget2に格納し、内容を確認する
checkTarget2 <- GetCheckTarget2(nonTargetUidAndAddresses, checkTarget1Uid)
if (length(checkTarget2) != 0) {
  warning("error:checkTarget2")
}
###############
### check 3 ###
###############
# allPapersに出力されていないレコード
dummy <- ExecCheckTarget3() |> ExportToGlobal()
rm(dummy)