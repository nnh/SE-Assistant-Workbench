#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(here)
# ------ constants ------
kParentPath <- "Box\\Projects\\NHO 臨床研究支援部\\英文論文\\wos-tools\\result\\result_20240925100939\\"
krawJsonPath <- str_c(kParentPath, "raw\\raw.json")
kAllPapersJsonPath <- str_c(kParentPath, "raw\\all_papers.json")
kHtmlPath <- str_c(kParentPath, "html\\")
# ------ functions ------
source(here("common_function.R"), encoding="UTF-8")
GetPublicationsWosId <- function(url) {
  html_file <- url |> read_html()
  # 'WOS:'で始まるIDを持つdiv要素を全て取得
  div_elements <- html_file |> html_nodes(xpath = "//*[starts-with(@id, 'WOS:')]")
  div_ids <- div_elements |> html_attr("id")
  return(div_ids)
}
GetPublicationsWosIds <- function(inputPath) {
  htmlFiles <- inputPath |> list.files(full.names=T) |> str_extract("^.*\\\\publication_[0-9]{4}_[0-9]{2}\\.html$") |> na.omit()
  htmlYm <- htmlFiles |> basename() |> str_remove("publication_") |> str_remove("\\.html") |> str_remove("_")
  res <- htmlFiles |> map( ~ GetPublicationsWosId(.))
  names(res) <- htmlYm
  return(res)  
}
# ------ main ------
homeDir <- GetHomeDir()
htmlWosIdList <- file.path(homeDir, kHtmlPath) |> GetPublicationsWosIds()
allPapers <- file.path(homeDir, kAllPapersJsonPath) |> read_json() |> map_df( ~ c(uid=.$uid, targetDate= gsub("-", "", substr(.$targetDate, 1, 7))))
# rawdataから出力対象と思われるデータとそれ以外のデータを取得する
rec <- file.path(homeDir, krawJsonPath) |> GetRawData()
addresses <- rec |> map( ~ list(uid=.$UID, addresses=.$static_data$fullrecord_metadata$addresses))
allAddresses <- GetAllAddresses(addresses)
# 一つでもNHO病院があればtargetに格納, それ以外はnontargetに格納
target <- allAddresses |> map( ~ {
  res <- .
  checkNho <- res$addresses |> str_detect(regex("Natl Hosp Org", ignore_case = T)) |> any()
  if (checkNho) {
    return(res)
  }
  checkNho <- res$addresses |> str_detect(regex("NHO ", ignore_case = T)) |> any()
  if (checkNho) {
    return(res)
  }
  checkNho <- res$addresses |> str_detect(regex("NHO,", ignore_case = T)) |> any()
  if (checkNho) {
    return(res)
  }
  checkNho <- nhoUid |> filter(uid == res$uid)
  if (nrow(checkNho) > 0) {
    return(res)
  }
  return(NULL)
}) |> discard( ~ is.null(.))
targetUids <- target |> map( ~ .$uid)
names(targetUids) <- targetUids
nonTarget <- allAddresses |> map( ~ {
  res <- .
  if (is.null(targetUids[[res$uid]])) {
    return(res)
  } else {
    return(NULL)
  }
}) |> discard( ~ is.null(.))
names(nonTarget) <- nonTarget |> map_chr( ~ .$uid)
# NHO病院が一つも入っていなかったレコードのリスト
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

