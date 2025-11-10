library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)


# "item_visit",
# "item",
# "visit",
# "allocation",
# "sheet_groups",
#bev <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/Bev-FOLFOX-SBC_250929_1501.json" %>% read_json()
#bev_allocation <- bev$sheets %>% keep(~ .$category == "allocation")
#before_allocation <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML-FLT3-ITD/AML224-FLT3-ITD/allocation1.json" %>% jsonlite::read_json()
allocation_target <- input_json$sheets %>% keep(~ .$category == "allocation")
allocation <- allocation_target %>% map( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    allocation <- sheet$allocation
    groups <- allocation$groups %>% map_df( ~ {
        group <- .x
        group$allocatees <- NULL
        return(group)
    })
    allocation$groups <- NULL
    df_allocation <- allocation %>% as_tibble()
    field_items <- if ("field_items" %in% names(sheet)) sheet$field_items else NULL
    if (!is.null(field_items)) {
            formula_fields <- field_items %>% map_df( ~ {
               if ("formula_field" %in% names(.x)) {
                return(c(formula_field=.x$formula_field))
            } else {
                return(c(formula_field=""))
            }
        })
    }
    if (length(formula_fields) == 0 || is.null(field_items)) {
        formula_fields <- tibble(formula_field = "")
    }
    df_groups <- groups %>% cbind(formula_fields)
    df_allocation_group <- df_allocation %>% cbind(df_groups)
    df <- tibble(jpname = jpname, alias_name = alias_name)
    res <- df %>% cbind(df_allocation_group)
    return(res)
}) %>% bind_rows()
    write_csv(allocation, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_allocation.csv")