library(jsonlite)
library(here)
library(tidyverse)
test <- jsonlite::read_json("C:/Users/MarikoOhtsuka/Downloads/me.json")
boards <- test$boards
GetUserDirectory <- function() {
  if (Sys.info()["sysname"] == "Windows") {
    return(Sys.getenv("USERPROFILE"))
  } else {
    return(Sys.getenv("HOME"))
  }
}
inputDir <- GetUserDirectory() %>% file.path("Downloads")
outputDir <- GetUserDirectory() %>% file.path("Box", "Datacenter", "ISR", "%todayDir%", "trello_backup")
test2 <- boards %>% map_df( ~ list(rem =str_c("ren ", inputDir, "\\", .$shortLink, ".json ", outputDir, "\\", .$name, ".json")))
test2 %>% write.table(file.path(mydir, "ren.bat"), row.names=F, quote=F)
