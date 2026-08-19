rm(list = ls())
library(jsonlite)
library(tidyverse)
library(here)

source(here("constant.R"))
source(here("generate_random_date.R"))
source(here("generate_brthdtc.R"))
source(here("build_dm_domain.R"))
source(here("build_ae_domain.R"))
source(here("build_meddra_soc_pt_llt.R"))
source(here("build_ds_domain.R"))
registration_n <- 100
registration_start_date <- "2024-04-01"

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
    value == "SPDEVID" ~ value,
    TRUE ~ str_c(prefix, value)
  ))

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

cdisc_variable_spec <- df_cdisc %>% left_join(field_option, by=c("alias_name", "field")) %>% select(prefix, cdisc_variable, default_value, option_name, is_invisible, field_type, alias_name)
cdisc_variable_values <- cdisc_variable_spec %>% left_join(options, by=c("option_name", "is_invisible"), relationship = "many-to-many")
cdisc_variable_values <- cdisc_variable_values %>% select(-option_name) %>% distinct() %>% arrange(prefix, cdisc_variable)

# sheet_orders(シートの表示順)をalias_name(=sheet)で結合
sheet_order <- edc_spec$sheet_orders %>% map_dfr(~ tibble(alias_name = .$sheet, sheet_seq = .$seq))
cdisc_variable_values <- cdisc_variable_values %>% left_join(sheet_order, by = "alias_name")

# MedDRA
meddra <- build_meddra_hierarchy()

# DM
dm <- build_dm_domain(n = registration_n)
dm <- populate_dm_domain(dm, cdisc_variable_values, registration_start_date)
# AE
ae <- dm %>% build_ae_domain()
ae <- populate_ae_domain(ae, cdisc_variable_values, registration_start_date, meddra)
death_date <- build_death_date_table(ae)
# DS
ds <- build_ds_domain(dm, cdisc_variable_values)
ds <- populate_ds_domain(ds, cdisc_variable_values, registration_start_date)
ds <- finalize_ds_disposition(ds, death_date)
discontinuation_date <- build_discontinuation_date_table(ds)

