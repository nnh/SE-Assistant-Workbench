library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)

# "explanation",
explanation_target <- input_json$sheets
explanation_fieldItems <- explanation_target %>% map( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    field_items <- sheet$field_items %>% map( ~ {
        field_item <- .x
        description <- if ("description" %in% names(field_item)) field_item$description else NULL
        if (is.null(description)) {
            return(NULL)
        }
        if (description == "") {
            return(NULL)
        }
        res <- list(jpname = jpname, alias_name = alias_name, field_item_name = field_item$name, field_item_label = field_item$label, description = description)
        return(res)
    }) %>% discard( ~ is.null(.x) )
    if (length(field_items) == 0) {
        return(NULL)
    }
    return(field_items)
}) %>% discard( ~ is.null(.x) )
if (length(explanation_fieldItems) > 0) {
    explanation_result <- bind_rows(explanation_fieldItems)
    write_csv(explanation_result, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_explanation.csv")
} else {
    print("explanation 0件")
}
