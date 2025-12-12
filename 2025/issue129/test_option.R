library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)
# "option",
options <- input_json$options
options_names <- options %>% map_chr(~ .x$name)
names(options) <- options_names
option_target <- input_json$sheets
option_fieldItems <- option_target %>%
    map(~ {
        sheet <- .x
        jpname <- sheet$name
        alias_name <- sheet$alias_name
        field_items <- sheet$field_items %>%
            map(~ {
                field_item <- .x
                if (field_item$type != "FieldItem::Article") {
                    return(NULL)
                }
                option_name <- if ("option_name" %in% names(field_item)) field_item$option_name else NULL
                if (is.null(option_name) || option_name == "") {
                    return(NULL)
                }
                is_option_exist <- option_name %in% options_names
                if (!is_option_exist) {
                    return(NULL)
                }
                option_values <- options[[option_name]]$values %>% keep(~ .$is_usable)
                if (length(option_values) == 0) {
                    return(NULL)
                }
                df_option_values <- bind_rows(option_values)
                df <- tibble(jpname, alias_name, option_name)
                res <- cbind(df, df_option_values)
                return(res)
            }) %>%
            discard(~ is.null(.x))
        if (length(field_items) == 0) {
            return(NULL)
        }
        return(field_items)
    }) %>%
    discard(~ is.null(.x))
if (length(option_fieldItems) > 0) {
    option_result <- bind_rows(option_fieldItems) %>% distinct()
    source("test_getvisitgroups.r")
    visit_groups <- GetVisitGroups(input_json)
    res <- option_result %>%
        JoinVisitGroups(visit_groups) %>%
        distinct()
    write_csv(res, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_option.csv")
} else {
    print("option 0件")
}
