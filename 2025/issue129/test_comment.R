library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- json

# "comment",
comment_target <- input_json$sheets
comment_fieldItems <- comment_target %>% map( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    field_items <- sheet$field_items %>% map( ~ {
        field_item <- .x
        content <- if ("content" %in% names(field_item)) field_item$content else NULL
        if (is.null(content)) {
            return(NULL)
        }
        if (content == "") {
            return(NULL)
        }
        res <- list(jpname = jpname, alias_name = alias_name, field_item_name = field_item$name, field_item_label = field_item$label, content = content)
        return(res)
    }) %>% discard( ~ is.null(.x) )
    if (length(field_items) == 0) {
        return(NULL)
    }
    return(field_items)
}) %>% discard( ~ is.null(.x) )
if (length(comment_fieldItems) > 0) {
    comment_result <- bind_rows(comment_fieldItems)
    write_csv(comment_result, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_comment.csv")
} else {
    print("comment 0件")
}
