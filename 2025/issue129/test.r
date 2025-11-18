library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)


# "item_visit",
# "item",

item_target <- input_json$sheets %>% map( ~ {
    jpname <- .x$name
    alias_name <- .x$alias_name
  fieldItems <- .x$field_items %>% keep( ~ .x$type == "FieldItem::Article")
  if (length(fieldItems) == 0) {
    return (NULL)
  }
  res <- tibble()
  for (i in seq_along(fieldItems)) {
    fieldItem <- fieldItems[[i]]
    res[i, "jpname"] <- jpname
    res[i, "alias_name"] <- alias_name
    res[i, "field_item_name"] <- fieldItem$name
    res[i, "field_item_label"] <- fieldItem$label
    res[i, "option_name"] <- if("option_name" %in% names(fieldItem)) fieldItem$option_name else ""
    res[i, "default_value"] <- if("default_value" %in% names(fieldItem)) fieldItem$default_value else ""
    validators <- if ("validators" %in% names(fieldItem)) fieldItem$validators else NULL
    if (is.null(validators)) {
        validators_presence_validate_presence_if <- ""
        validators_formula_validate_formula_if <- ""
        validators_formula_validate_formula_message <- ""
    } else {
        validators_presence <- if ("presence" %in% names(validators)) validators$presence else NULL
        if (is.null(validators_presence)) {
            validators_presence_validate_presence_if <- ""
        } else {
            validators_presence_validate_presence_if <- if ("validate_presence_if" %in% names(validators_presence)) validators_presence$validate_presence_if else ""
        }
        validators_formula <- if ("formula" %in% names(validators)) validators$formula else NULL
        if (is.null(validators_formula)) {
            validators_formula_validate_formula_if <- ""
            validators_formula_validate_formula_message <- ""
        } else {
            validators_formula_validate_formula_if <- if ("validate_formula_if" %in% names(validators_formula)) validators_formula$validate_formula_if else ""
            validators_formula_validate_formula_message <- if ("validate_formula_message" %in% names(validators_formula)) validators_formula$validate_formula_message else ""
        }
        validators_date <- if ("date" %in% names(validators)) validators$date else NULL
        if (is.null(validators_date)) {
            validators_date_after_or_equal_to <- ""
            validators_date_before_or_equal_to <- ""
        } else {
            validators_date_after_or_equal_to <- if ("validate_date_after_or_equal_to" %in% names(validators_date)) validators_date$validate_date_after_or_equal_to else ""
            validators_date_before_or_equal_to <- if ("validate_date_before_or_equal_to" %in% names(validators_date)) validators_date$validate_date_before_or_equal_to else ""
        }
        res[i, "validators_presence_validate_presence_if"] <- validators_presence_validate_presence_if
        res[i, "validators_formula_validate_formula_if"] <- validators_formula_validate_formula_if
        res[i, "validators_formula_validate_formula_message"] <- validators_formula_validate_formula_message
        res[i, "validators_date_after_or_equal_to"] <- validators_date_after_or_equal_to
        res[i, "validators_date_before_or_equal_to"] <- validators_date_before_or_equal_to
    }
  }
  return(res)
}) %>% discard( ~ is.null(.x) ) %>% bind_rows()
write_csv(item_target, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_item_visit_item.csv")
# "sheet_groups",
# sheet_groupsは未実装のためスキップ
