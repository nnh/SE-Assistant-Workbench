library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)

# "display",
display_target <- input_json$sheets
display_fieldItems <- display_target %>% map( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    field_items <- sheet$field_items %>% map( ~ {
        field_item <- .x
        if (field_item$type != "FieldItem::Article" && field_item$type != "FieldItem::Assigned") {
            return(NULL)
        }
        if (field_item$is_invisible) {
            if (field_item$type == "FieldItem::Assigned") {
                return(NULL)
            }
        } else {
            if (field_item$type == "FieldItem::Article") {
                return(NULL)
            }
        }
        res <- list(jpname = jpname, alias_name = alias_name, field_item_name = field_item$name, field_item_label = field_item$label, field_item_type = field_item$type, is_invisible = field_item$is_invisible)
        return(res)
    }) %>% discard( ~ is.null(.x) )
    if (length(field_items) == 0) {
        return(NULL)
    }
    return(field_items)
}) %>% discard( ~ is.null(.x) )
if (length(display_fieldItems) > 0) {
    display_result <- bind_rows(display_fieldItems)
} else {
    print("display 0件")
    display_result <- tibble(name = character(), alias_name = character(), field_item_name = character(), field_item_label = character(), field_item_type = character(), is_invisible = logical())
}
write_csv(display_result, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_display.csv")

