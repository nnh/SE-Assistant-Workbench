rm(list = ls())
library(jsonlite)
library(tidyverse)

json_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Stat/Trials/HMCSG/HMCSG-Tucidinostat-rrPTCL/specs/EDC/Tucidinostat-rrPTCL_260616_1112.json"

edc_spec <- jsonlite::read_json(json_path)
sheets <- edc_spec[["sheets"]]

build_cdisc_sheet_config_table <- function(sheet) {
  field_items <- if (length(sheet$field_items) == 0) {
    tibble(field = character(), default_value = character(), is_invisible = character(), field_type = character())
  } else {
    sheet$field_items %>%
      map_dfr(~ tibble(field = .$name, default_value = .$default_value, is_invisible=.$is_invisible,field_type = .$field_type))
  }

  prefix_field_table <- if (length(sheet$cdisc_sheet_configs) == 0) {
    tibble(prefix = character(), field = character(), value = character())
  } else {
    sheet$cdisc_sheet_configs %>%
      map_dfr(~ tibble(
        prefix = .x[["prefix"]],
        field = names(.x[["table"]]),
        value = map_chr(.x[["table"]], ~ if (is.null(.x)) NA_character_ else .x)
      ))
  }

  result <- prefix_field_table %>%
    inner_join(field_items, by = "field") %>%
    filter(!is.na(value), !str_starts(value, "_"))
  result[["alias_name"]] <- sheet$alias_name
  return(result)
}

df_cdisc <- map_dfr(sheets, build_cdisc_sheet_config_table, .id = "sheet_index") %>%
  mutate(cdisc_variable = case_when(
    prefix == "DM" ~ value,
    value == "VISITNUM" ~ value,
    TRUE ~ str_c(prefix, value)
  ))

test <- df_cdisc %>% filter(is_invisible & default_value != "")

options <- edc_spec$options %>% map_dfr(function(opt) {
  opt$values %>%
    map_dfr(~ tibble(
      value_name = .$name,
      seq = .$seq,
      code = .$code,
      is_usable = .$is_usable
    )) %>%
    mutate(option_name = opt$name, .before = 1)
}) %>% filter(is_usable) %>% select(-is_usable)
options[["is_invisible"]] <- FALSE

field_option <- sheets %>% map_dfr( ~ {
  alias_name <- .$alias_name
  field_items <- .$field_items %>% keep( ~ "option_name" %in% names(.x))
  if (length(field_items) == 0) {
    return()
  }
  result <- field_items %>% map_dfr( ~ tibble(field=.$name, option_name=.$option_name))
  result[["alias_name"]] <- alias_name
  return(result)
})

cdisc_variable_spec <- df_cdisc %>% left_join(field_option, by=c("alias_name", "field")) %>% select(prefix, cdisc_variable, default_value, option_name, is_invisible, field_type)
test <- cdisc_variable_spec %>% left_join(options, by=c("option_name", "is_invisible"), relationship = "many-to-many")
test <- test %>% select(-option_name) %>% distinct() %>% arrange(prefix, cdisc_variable)

