library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)

# "allocation",
#bev <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/Bev-FOLFOX-SBC_250929_1501.json" %>% read_json()
#bev_allocation <- bev$sheets %>% keep(~ .$category == "allocation")
#before_allocation <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML-FLT3-ITD/AML224-FLT3-ITD/allocation1.json" %>% jsonlite::read_json()
allocation_target <- input_json$sheets %>% keep(~ .$category == "allocation")
allocation <- allocation_target %>% map( ~ {
    sheet <- .x
    jpname <- sheet$name
    alias_name <- sheet$alias_name
    allocation <- sheet$allocation
    groups <- tibble()
    for (i in seq_along(allocation$groups)) {
        groups[i, "ifif"] <- if ("if" %in% names(allocation$groups[[i]])) allocation$groups[[i]]$`if` else ""
        groups[i, "ifRef"] <- ""
        groups[i, "code"] <- if ("code" %in% names(allocation$groups[[i]])) allocation$groups[[i]]$code else ""
        groups[i, "label"] <- if ("label" %in% names(allocation$groups[[i]])) allocation$groups[[i]]$label else ""
        groups[i, "message"] <- if ("message" %in% names(allocation$groups[[i]])) allocation$groups[[i]]$message else ""
    }
    is_zelen <- if ("is_zelen" %in% names(allocation)) allocation$is_zelen else ""
    imbalance <- if ("zelen_imbalance" %in% names(allocation)) allocation$zelen_imbalance else ""
    is_double_blind <- if ("is_double_blinded" %in% names(allocation)) allocation$is_double_blinded else ""
    double_bind_email <- if ("double_bind_email" %in% names(allocation)) allocation$double_bind_email else ""
    allocation_method <- if ("allocation_method" %in% names(allocation)) allocation$allocation_method else ""
    df_allocation <- tibble()
    df_allocation[1, "is_zelen"] <- is_zelen
    df_allocation[1, "imbalance"] <- imbalance
    df_allocation[1, "is_double_blind"] <- is_double_blind
    df_allocation[1, "double_bind_email"] <- double_bind_email
    df_allocation[1, "allocation_method"] <- allocation_method
    df_allocation <<- df_allocation
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
    dfgroups <<- groups
    formula_fields <<- formula_fields
    df_groups <- groups %>% cbind(formula_fields)
    df_groups <<- df_groups
    df_allocation_group <- df_allocation %>% cbind(df_groups)
    df <- tibble(jpname = jpname, alias_name = alias_name)
    res <- df %>% cbind(df_allocation_group)
    return(res)
}) %>% bind_rows()
    allocation$fieldRef <- ""
    write_csv(allocation, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_allocation.csv")
