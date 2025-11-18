library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)
# "action"
action_target <- input_json$sheets
action_fieldItems <- action_target %>% map( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    field_items <- sheet$field_items %>% map( ~ {
        field_item <- .x
        flip_flops <- if ("flip_flops" %in% names(field_item)) field_item$flip_flops else NULL
        if (is.null(flip_flops)) {
            return(NULL)
        }
        field_item_name <- field_item$name
        field_item_label <- field_item$label
        return(list(name = field_item_name, label = field_item_label, flip_flops = flip_flops))
    }) %>% discard( ~ is.null(.x) )
    if (length(field_items) == 0) {
        return(NULL)
    }
    tibble_field_items <- field_items %>% map( ~ {
        field_item_list <<- .x
        flip_flops <- if ("flip_flops" %in% names(field_item_list)) field_item_list$flip_flops else NULL
        if (is.null(flip_flops)) {
            return(NULL)
        }
        field_item <- flip_flops %>% map( ~ {
            fi <- .x
            codes <- fi$codes %>% unlist()
            fields <- fi$fields %>% unlist()
            res <- crossing(code = codes, field = fields) %>% tibble()
            return(res)
        })
        field_item[[1]]$name <- field_item_list$name
        field_item[[1]]$label <- field_item_list$label
        return(field_item)
    })
    if (length(tibble_field_items) == 0) {
        return(NULL)
    }
    bind_tibble_field_items <- bind_rows(tibble_field_items)
    bind_tibble_field_items$field_item_name <- jpname
    bind_tibble_field_items$alias_name <- alias_name
    field_items_name_labels <- sheet$field_items %>% map( ~ {
        fi <- .x
        return(list(name = fi$name, label = fi$label))
    }) %>% bind_rows()
    bind_tibble_field_items <- bind_tibble_field_items %>%
        left_join(field_items_name_labels, by = c("field" = "name"))
        return(bind_tibble_field_items)
        res <- bind_tibble_field_items %>% select(jpname, alias_name, name, label.x, code, field, label.y)
}) %>% discard( ~ is.null(.x) )
if (length(action_fieldItems) > 0) {
    action_result <- bind_rows(action_fieldItems) %>% select(field_item_name, alias_name, name, label.x, code, field, label.y)
    write_csv(action_result, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_action.csv")
} else {
    print("action 0件")
}

