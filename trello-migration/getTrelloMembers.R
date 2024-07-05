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

# ------ functions ------
GetUserDirectory <- function() {
  if (Sys.info()["sysname"] == "Windows") {
    return(Sys.getenv("USERPROFILE"))
  } else {
    return(Sys.getenv("HOME"))
  }
}
# ------ main ------
inputDir <- GetUserDirectory() %>% file.path("Box", "Datacenter", "ISR", "trello_backup", "20240322")
target_files <- inputDir %>% list.files(full.names=T)
target_names <- target_files %>% basename() %>% str_remove(".json")
target_list <- target_files %>% map( ~ read_json(.) %>% .$members %>% map( ~ .$fullName))
names(target_list) <- target_names
output_df <- map2_df(target_list, names(target_list), function(users, board) {
  temp <- data.frame(board=board, user = unlist(users))
  return(temp)
})
write.csv(output_df, here("member.txt"), row.names = F, quote = F)
