library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)
# "date",
date_target <- input_json$sheets
date_fieldItems <- date_target %>%
    map(~ {
        sheet <- .x
        jpname <- sheet$name
        alias_name <- sheet$alias_name
        field_items <- sheet$field_items %>%
            map(~ {
                field_item <- .x
                validators <- if ("validators" %in% names(field_item)) field_item$validators else NULL
                if (is.null(validators)) {
                    return(NULL)
                }
                date_validators <- if ("date" %in% names(validators)) validators$date else NULL
                if (is.null(date_validators)) {
                    return(NULL)
                }
                before <- if ("validate_date_before_or_equal_to" %in% names(date_validators)) date_validators$validate_date_before_or_equal_to else ""
                after <- if ("validate_date_after_or_equal_to" %in% names(date_validators)) date_validators$validate_date_after_or_equal_to else ""
                before_after <- tibble(before = before, after = after)
                df <- tibble(jpname, alias_name, field_item_name = field_item$name, field_item_label = field_item$label)
                res <- cbind(df, before_after)
                return(res)
            }) %>%
            discard(~ is.null(.x))
        if (length(field_items) == 0) {
            return(NULL)
        }
        return(field_items)
    }) %>%
    discard(~ is.null(.x))
if (length(date_fieldItems) > 0) {
    date_result <- bind_rows(date_fieldItems)
    date_result$before_ref <- ""
    date_result$after_ref <- NA
    for (i in 1:nrow(date_result)) {
        after <- date_result[i, "after"] %>% str_remove_all("\\s")
        if (str_detect(after, "field[0-9]+")) {
            alias_name <- date_result[i, "alias_name"]
            field_item_name <- date_result[i, "field_item_name"]
            label <- date_target %>%
                keep(~ .x$alias_name == alias_name) %>%
                .[[1]] %>%
                .$field_items %>%
                keep(~ .x$name == after) %>%
                .[[1]] %>%
                .$label
            output_alias_name <- alias_name %>% str_remove("_[0-9]+$")
            text <- str_c("(", output_alias_name, ",", after, ",", label, ")")
            date_result[i, "after_ref"] <- text
        }
    }
    res <- date_result %>% select(jpname, alias_name, field_item_name, field_item_label, after, after_ref, before, before_ref)
    source("test_getvisitgroups.r")
    visit_groups <- GetVisitGroups(input_json)
    res <- res %>%
        JoinVisitGroups(visit_groups) %>%
        distinct()
    write_csv(res, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_date.csv")
} else {
    print("date 0件")
}
