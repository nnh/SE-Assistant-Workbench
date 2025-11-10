library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)

# "name",
name_target <- input_json$sheets
name_list <- name_target %>% map_df( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    images_count <- sheet$images_count
    res <- list(jpname = jpname, alias_name = alias_name, images_count = images_count)
    return(res)
})
write_csv(name_list, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_name.csv")

