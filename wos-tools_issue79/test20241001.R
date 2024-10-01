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
GetHomeDir <- function() {
  os <- Sys.info()["sysname"]
  if (os == "Windows") {
    home_dir <- Sys.getenv("USERPROFILE")
  } else if (os == "Darwin") {
    home_dir <- Sys.getenv("HOME")
  } else {
    stop("Unsupported OS")
  }
  return (home_dir)
}
# ------ main ------
homeDir <- GetHomeDir()
rawDataPath <- file.path(homeDir, "Box\\Projects\\NHO 臨床研究支援部\\英文論文\\wos-tools\\result\\result_20240925100939\\raw\\raw.json")
rawJson <- rawDataPath |> read_json()
rec <- rawJson |> map( ~ .$Data$Records$records$REC) |> list_flatten()
addresses <- rec |> map( ~ list(uid=.$UID, addresses=.$static_data$fullrecord_metadata$addresses))
addressesOnlyJapan <- addresses |> map( ~ {
  res <- .
  if (!is.null(res$addresses$address_name$address_spec)) {
    temp <- res$addresses$address_name
    res$addresses$address_name <- list(temp)
  }
  temp <- res$addresses$address_name |> map( ~ {
    address_spec <- .$address_spec
    if (!str_detect(address_spec$country, regex("japan", ignore_case = T))) {
      return(NULL)
    }
    return(address_spec)
  }) |> discard( ~ is.null(.))
  res$addresses <- temp
  return(res)
})
allAddresses <- addressesOnlyJapan |> map( ~ {
  res <- .
  fullAddresses <- res$addresses |> map( ~ .$full_address)
  organizations <- res$addresses |> map( ~ {
    orgs <- .$organizations
    contents <- orgs$organization |> map( ~ .$content)
    return(contents)
  }) |> list_flatten()
  allAddresses <- list(fullAddresses, organizations) |> list_flatten()
  res$addresses <- allAddresses
  return(res)
})
# 一つでもNHO病院があればtargetに格納
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


addressList <- nonTarget |> map( ~ .$addresses) |> list_flatten() |> map( ~ str_split(., ",")) |> unlist() |> trimws()|> unique() |> as.list()
# 郵便番号を除去
addressList <- addressList |> map_if(~ str_detect(.x, "[0-9]{7}"), ~ NULL) |> discard( ~ is.null(.))
# ハイフン区切りの数字が入っていたら住所とみなす
addressList <- addressList |> map_if(~ str_detect(.x, "[0-9]+-[0-9]+"), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, "^[0-9]+ [A-Za-z]+"), ~ NULL) |> discard( ~ is.null(.))
# 空白を一つも含まないものは地名とみなす
addressList <- addressList |> map_if(~ !str_detect(.x, "\\s"), ~ NULL) |> discard( ~ is.null(.))
# Dept～、Div～は部署とみなす
addressList <- addressList |> map_if(~ str_detect(.x, regex("Dept ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Div ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
# 大学を除去
addressList <- addressList |> map_if(~ str_detect(.x, regex("Univ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("medical school", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("med sch", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("sch med", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("sch dent", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" sci$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" sch$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" coll$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
# 区町名を除去
addressList <- addressList |> map_if(~ str_detect(.x, regex(" ku$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" cho$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
# 公立病院を除去
addressList <- addressList |> map_if(~ str_detect(.x, regex(" rosai hosp", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("kobe city", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" city hosp", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" City Gen Hosp", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" City General Hosp", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("city$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Prefectural", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Prefecture", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Citizens Hosp", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Metropolitan ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Japan Org ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Japan Community Hlth Care Org", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Natl Canc Ctr", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Canc Inst Hosp", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
# 診療所を除去
addressList <- addressList |> map_if(~ str_detect(.x, regex(" clin$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("^clin ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" clin ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
# 企業を除去
addressList <- addressList |> map_if(~ str_detect(.x, regex(" ltd$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("co\\.$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("red cross", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("redcross", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("jcho ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("assoc ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("assoc$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("japan$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("NTT", ignore_case = F)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("JR ", ignore_case = F)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("JA ", ignore_case = F)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("KKR ", ignore_case = F)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("^Res Inst$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" Limited$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" Fdn$", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" Fdn ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" Heart Center", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" Heart Ctr", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex(" Memorial Hospital", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Foundation", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Eastern Chiba Med Ctr", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
addressList <- addressList |> map_if(~ str_detect(.x, regex("Dev ", ignore_case = T)), ~ NULL) |> discard( ~ is.null(.))
