library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)

# "visit",
# VISIT対応の試験
visits <- input_json$visits %>% map_df(~ c(num = .$num, name = .$name))
visit_target <- input_json$sheets %>%
    keep(~ .$category == "visit") %>%
    map_df(~ c(jpname = .$name, alias_name = .$alias_name))
visit_target$visitnum <- visit_target$alias_name %>% str_extract("\\d+$")
temp_visit <- visit_target$jpname %>%
    str_split("\\(") %>%
    map_chr(~ tail(.x, 1)) %>%
    str_remove("\\)$")
visit_target$visit <- temp_visit
temp_jpname <- visit_target$jpname %>%
    str_split("\\(") %>%
    map_chr(~ head(.x, 1)) %>%
    str_trim()
visit_target$jpname <- temp_jpname
source("test_getsheetorder.R")
sheet_orders <- GetSheetOrder(input_json)
res <- visit_target %>%
    left_join(sheet_orders, by = "alias_name") %>%
    arrange(visitnum, seq) %>%
    select(-seq)
write_csv(visit_target, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_visits.csv")
