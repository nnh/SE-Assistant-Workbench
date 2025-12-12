library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)

# "limitation",
limitation_target <- input_json$sheets
limitation_fieldItems <- limitation_target %>%
    map(~ {
        sheet <- .x
        jpname <- sheet$name
        alias_name <- sheet$alias_name
        field_items <- sheet$field_items %>%
            map(~ {
                field_item <- .x
                normal_range <- if ("normal_range" %in% names(field_item)) field_item$normal_range else NULL
                validators <- if ("validators" %in% names(field_item)) field_item$validators else NULL
                if (is.null(normal_range) && is.null(validators)) {
                    return(NULL)
                }
                normal_range_less_than_or_equal_to <- ""
                normal_range_greater_than_or_equal_to <- ""
                if (!is.null(normal_range)) {
                    if ("less_than_or_equal_to" %in% names(normal_range)) {
                        normal_range_less_than_or_equal_to <- normal_range$less_than_or_equal_to %>% as.character()
                    }
                    if ("greater_than_or_equal_to" %in% names(normal_range)) {
                        normal_range_greater_than_or_equal_to <- normal_range$greater_than_or_equal_to %>% as.character()
                    }
                }
                validate_numericality_less_than_or_equal_to <- ""
                validate_numericality_greater_than_or_equal_to <- ""
                if (!is.null(validators)) {
                    numericality_validators <- if ("numericality" %in% names(validators)) validators$numericality else NULL
                    if (!is.null(numericality_validators)) {
                        if ("validate_numericality_less_than_or_equal_to" %in% names(numericality_validators)) {
                            validate_numericality_less_than_or_equal_to <- numericality_validators$validate_numericality_less_than_or_equal_to %>% as.character()
                        }
                        if ("validate_numericality_greater_than_or_equal_to" %in% names(numericality_validators)) {
                            validate_numericality_greater_than_or_equal_to <- numericality_validators$validate_numericality_greater_than_or_equal_to %>% as.character()
                        }
                    }
                }
                res <- tibble(jpname, alias_name, field_item_name = field_item$name, field_item_label = field_item$label, normal_range_less_than_or_equal_to, normal_range_greater_than_or_equal_to, validate_numericality_less_than_or_equal_to, validate_numericality_greater_than_or_equal_to)
                return(res)
            }) %>%
            discard(~ is.null(.x))
        if (length(field_items) == 0) {
            return(NULL)
        }
        res <- field_items
        return(res)
    }) %>%
    discard(~ is.null(.x))
if (length(limitation_fieldItems) > 0) {
    limitation_result <- bind_rows(limitation_fieldItems)
    res <- limitation_result %>%
        filter(
            normal_range_less_than_or_equal_to != "" |
                normal_range_greater_than_or_equal_to != "" |
                validate_numericality_less_than_or_equal_to != "" |
                validate_numericality_greater_than_or_equal_to != ""
        )
    source("test_getvisitgroups.r")
    visit_groups <- GetVisitGroups(input_json)
    res <- res %>%
        JoinVisitGroups(visit_groups) %>%
        distinct()
    write_csv(res, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_limitation.csv")
} else {
    print("limitation 0件")
}
