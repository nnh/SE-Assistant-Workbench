library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)
# "master",
master_target <- input_json$sheets
master_fieldItems <- master_target %>% map( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    field_items <- sheet$field_items %>% map( ~ {
        field_item <- .x
        link_type <- if ("link_type" %in% names(field_item)) field_item$link_type else NULL
        if (is.null(link_type)) {
            return(NULL)
        }
        if (link_type == "") {
            return(NULL)
        }
        res <- list(jpname = jpname, alias_name = alias_name, field_item_name = field_item$name, field_item_label = field_item$label, link_type = link_type)
        return(res)
    }) %>% discard( ~ is.null(.x) )
    if (length(field_items) == 0) {
        return(NULL)
    }
    return(field_items)
}) %>% discard( ~ is.null(.x) )
if (length(master_fieldItems) > 0) {
    master_result <- bind_rows(master_fieldItems)
    write_csv(master_result, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_master.csv")
} else {
    print("master 0件")
}
