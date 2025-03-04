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
targetDir <- GetHomeDir() %>% file.path("Box\\Projects\\NMC ISR 情報システム研究室\\SystemAssistant\\skype")
folderNames <- c("S1", "S2", "S3")
targetDirs <- folderNames %>% file.path(targetDir, .) 
targetFolders <- targetDirs %>% map_chr( ~ list.dirs(., ) %>% str_extract(., ".*_export") %>% na.omit())
targetFiles <- targetFolders %>% map( ~ list.files(., pattern=".json", full.names = T))
targetJsons <- targetFiles %>% map( ~ {
  messages <- .[2] %>% read_json()
  res <- messages$conversations %>% map( ~ .$MessageList %>% map( ~ .$properties$callLog)) %>% unlist()
  return(res)
}) %>% unlist()
callLogs <- targetJsons %>% map( ~ {
  callLog <- fromJSON(.)
  startTime <- callLog$startTime %>% ymd_hms() %>% with_tz(tzone = "Asia/Tokyo")
  connectTime <- callLog$connectTime %>% ymd_hms() %>% with_tz(tzone = "Asia/Tokyo")
  endTime <- callLog$endTime %>% ymd_hms() %>% with_tz(tzone = "Asia/Tokyo")
  target <- callLog$target
  displayname <- callLog$originatorParticipant$displayName
  res <- list(displayname, target, startTime, connectTime, endTime)
  names(res) <- c("displayname", "target", "startTime", "connectTime", "endTime")
  return(res)
}) %>% bind_rows() 
callLogList <- callLogs %>% filter(!is.na(displayname)) %>% filter(target != "8:echo123")
callLogList$target <- callLogList$target %>% str_remove("4:\\+81")
#callLogList$startTime <- ymd_hms(callLogList$startTime)
#callLogList$startTime <- with_tz(callLogList$startTime, tzone = "Asia/Tokyo")
#callLogList$endTime <- ymd_hms(callLogList$endTime)
#callLogList$endTime <- with_tz(callLogList$endTime, tzone = "Asia/Tokyo")
#callLogList$duration_min <- as.numeric(difftime(callLogList$endTime, callLogList$connectTime, units = "mins"))
callLogList$duration <- difftime(callLogList$endTime, callLogList$connectTime)

# 分と秒に分けて表示
callLogList$duration_min_sec <- sapply(callLogList$duration, function(x) {
  mins <- as.numeric(x, units = "mins")
  secs <- as.numeric(x, units = "secs") %% 60
  paste0(floor(mins), "分", round(secs), "秒")
})

res <- callLogList %>%
  filter(startTime >= as.Date("2025-02-01")) %>% arrange(displayname,desc(startTime))
write_csv(res, file="C:\\Users\\MarikoOhtsuka\\Box\\Projects\\NMC ISR 情報システム研究室\\SystemAssistant\\skype\\202502.csv")
