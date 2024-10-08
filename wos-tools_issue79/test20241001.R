#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
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
# 施設名に問題があり、allPapersに出力されていないレコードをfacilityNameError, 
# 施設名に問題がなく、allPapersに出力されていないレコードをotherError1に格納
dummy <- ExecCheckTarget3() |> ExportToGlobal()
# facilityNameErrorの詳細を分析
facilityNameErrorfacilites <- facilityNameError$address |> str_split(", ")
facilityNameErrorfacilitesAndUids <- map2(facilityNameError$uid, facilityNameErrorfacilites, ~ {
  res <- data.frame(facility_part=.y)
  res$uid <- .x
  return(res)
}) |> bind_rows()
filterdFacilityNameErrorfacilitesAndUids <- facilityNameErrorfacilitesAndUids |> filter(str_detect(facility_part, "\\s")) |>
  filter(!str_detect(facility_part, "[0-9]")) |>
  filter(!str_detect(facility_part, "Dept ")) 
filterdFacilityNameErrorfacilitesAndUids$nho_flag <- F
# wos-toolsのクエリ施設名と部分一致するものがあれば詳細を確認
for (i in 1:nrow(filterdFacilityNameErrorfacilitesAndUids)) {
  tempFacilityName <- filterdFacilityNameErrorfacilitesAndUids[i, "facility_part"] |> tolower() 
  temp2 <- facilityData |> filter(str_detect(facilityNameLower, tempFacilityName))
  if (nrow(temp2) > 0) {
    if (tempFacilityName != "natl hosp org" & 
        tempFacilityName != "med ctr" &
        tempFacilityName != "natl hosp" &
        tempFacilityName != "clin res ctr" &
        tempFacilityName != "clin res" &
        tempFacilityName != "addict ctr"&
        tempFacilityName != "gen med ctr"&
        tempFacilityName != "chest med ctr"&
        tempFacilityName != "chuo chest med ctr"&
        tempFacilityName != "chuo natl hosp"&
        tempFacilityName != "nishi med ctr"&
        tempFacilityName != "minami med ctr"&
        tempFacilityName != "higashi natl hosp"&
        tempFacilityName != "natl hosp org kinki chuo"&
        !str_detect(tempFacilityName, "\\smed$") & 
        !str_detect(tempFacilityName, "natl hosp org\\s[a-z]+$")) {
#      print(tempFacilityName)
      filterdFacilityNameErrorfacilitesAndUids[i, "nho_flag"] <- T
    }
  }
}
test <- filterdFacilityNameErrorfacilitesAndUids |> filter(nho_flag)
# Googleスプレッドシートに結果を出力する
gs4_auth()
dummy <- outputSheetNames |> map( ~ CreateSheets(.))
rm(dummy)
dummy <- names(outputSheetNames) |> map( ~ ClearAndWriteSheet(outputSheetNames[[.]], get(.)))

                                         