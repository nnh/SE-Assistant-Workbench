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
kParentPath <- "Box\\Projects\\NHO 臨床研究支援部\\英文論文\\wos-tools\\result\\result_20240925100939\\"
krawJsonPath <- str_c(kParentPath, "raw\\raw.json")
kAllPapersJsonPath <- str_c(kParentPath, "raw\\all_papers.json")
kHtmlPath <- str_c(kParentPath, "html\\")
# ------ functions ------
source(here("common_function.R"), encoding="UTF-8")
gs4_auth()
# ------ main ------
homeDir <- GetHomeDir()
htmlWosIdList <- file.path(homeDir, kHtmlPath) |> GetPublicationsWosIds()
allPapers <- file.path(homeDir, kAllPapersJsonPath) |> read_json() |> map_df( ~ c(uid=.$uid, targetDate= gsub("-", "", substr(.$targetDate, 1, 7))))
# rawdataから出力対象と思われるデータとそれ以外のデータを取得する
rec <- file.path(homeDir, krawJsonPath) |> GetRawData()
addresses <- rec |> map( ~ list(uid=.$UID, addresses=.$static_data$fullrecord_metadata$addresses))
allAddresses <- GetAllAddresses(addresses)
# 一つでもNHO病院があればtargetに格納, それ以外はnontargetに格納
temp <- FilterTargetGroups(allAddresses)
dummy <- names(temp) |> map(~ assign(., temp[[.]], envir = globalenv()))
rm(temp)
rm(dummy)
# NHO病院が一つも入っていなかったレコードのリストを取得する
nonTargetUidAndAddresses <- nonTarget |> map( ~ {
  uid <- .$uid
  addresses <- .$addresses |> list_flatten() |> map( ~ str_split(., ",")) |> unlist() |> trimws()|> unique() |> as.list()
  res <- addresses |> map( ~ c(uid=uid, address=.))
  return(res)
}) |> list_flatten()
# NHO病院である可能性がある施設名が入っていたらcheckTarget1に格納
checkTarget1 <- nonTargetUidAndAddresses |> GetCheckTarget1()
# NHO病院である可能性がある施設名が入っているUIDのリスト
checkTarget1Uid <- GetTargetUids(checkTarget1)
# NHO病院であるかどうかを完全な施設名から確認する
checkTargetHospNames <- GetHospNamesForCheck1(checkTarget1, checkTarget1Uid)
# 0件でなければ内容を確認する
htmlOutputRecords <- data.frame(uid = character(), address = character(), targetDate = character())
nonHtmlOutputRecords <- data.frame(uid = character(), address = character())
if (length(checkTargetHospNames) != 0) {
  for (i in 1:nrow(checkTargetHospNames)) {
    targetDate <- allPapers |> filter(uid == checkTargetHospNames[i, "uid"]) %>% .$targetDate
    if (length(targetDate) == 0) {
      print(str_c("allPapersに出力なし：uid=", checkTargetHospNames[i, "uid"], " 施設名：", checkTargetHospNames[i, "address"]))
    } else {
      if (!is.na(targetDate)) {
        targetHtmlUids <- htmlWosIdList[[targetDate]]
        if (checkTargetHospNames[i, "uid"] %in% targetHtmlUids) {
          temp <- checkTargetHospNames[i, ]
          temp$targetDate <- targetDate
          htmlOutputRecords <- htmlOutputRecords |> bind_rows(temp)
        } else {
          nonHtmlOutputRecords <- nonHtmlOutputRecords |> bind_rows(checkTargetHospNames[i, ])
        }
      } else {
        print(str_c("targetDateなし：uid=", checkTargetHospNames[i, "uid"], " 施設名：", checkTargetHospNames[i, "address"]))
      }
    }
  }
  warning("error:checkTarget1")
}
if (nrow(htmlOutputRecords) > 0) {
  htmlOutputRecords <- htmlOutputRecords |> arrange(uid)
}
# NHO病院でないと思われる病院の中で未知の名称のものをcheckTarget2に格納
# 0件でなければ内容を確認する
checkTarget2 <- GetCheckTarget2(nonTargetUidAndAddresses, checkTarget1Uid)
if (length(checkTarget2) != 0) {
  warning("error:checkTarget2")
}
# target内のuidがHTMLファイルに全て出力されているか確認する
df_target <- targetUids |> unlist() |> unlist() |> as.data.frame() |> setNames("uid")
# allPapersに出力されていないもの
nonOutputAllPapersTarget <- df_target |> anti_join(allPapers, by="uid")
uidAndDateCreated <- rec |> map_df( ~ c(uid=.$UID, dateCreated=.$dates$date_created))
nonOutputAllPapersTargetDataCreated <- nonOutputAllPapersTarget |> left_join(uidAndDateCreated, by="uid")
nonOutputAllPapersTargetDataCreatedAddress <- data.frame(uid = character(), targetDate = character(), address = character())
for (i in 1:nrow(nonOutputAllPapersTargetDataCreated)) {
  temp_address <- target[[nonOutputAllPapersTargetDataCreated[i, "uid"]]]$addresses |>
    map( ~ CheckNhoFacilityName(.)) |> discard( ~ is.null(.)) |> list_c()
  if (is.null(temp_address)) {
    temp_address <- "no-target"
  }
  res <- nonOutputAllPapersTargetDataCreated[i, ] |> merge(temp_address)
  colnames(res) <- colnames(nonOutputAllPapersTargetDataCreatedAddress)
  nonOutputAllPapersTargetDataCreatedAddress <- nonOutputAllPapersTargetDataCreatedAddress |> bind_rows(res)
}
nonOutputAllPapersTargetDataCreatedAddress <- nonOutputAllPapersTargetDataCreatedAddress |> distinct()
# 施設名に問題があり、allPapersに出力されていない
facilityNameError <- nonOutputAllPapersTargetDataCreatedAddress |> filter(address != "no-target")
# 施設名に問題がなく、allPapersに出力されていない
otherError1 <- nonOutputAllPapersTargetDataCreatedAddress |> filter(address == "no-target")
# Googleスプレッドシートに結果を出力する
dummy <- names(outputSheetNames) |> map( ~ ClearAndWriteSheet(outputSheetNames[[.]], get(.)))

                                         