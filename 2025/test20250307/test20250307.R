#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
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
input_csv <- "C:\\Users\\MarikoOhtsuka\\Downloads\\HFK.csv" %>% read.csv(skip=4, fileEncoding = "cp932")
colnames(input_csv)
input_csv$date <- input_csv$日時 %>% as.Date(format = "%Y/%m/%d %H:%M:%S")
input_csv$time <- format(as.POSIXct(input_csv$日時, format = "%Y/%m/%d %H:%M:%S"), "%H:%M:%S")
output_csv <- input_csv %>%  group_by(date) %>%
  summarise(
    出勤 = min(time),
    退勤 = max(time)
  )
write.csv(output_csv, "C:\\Users\\MarikoOhtsuka\\Downloads\\summary.csv")
