library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)
# "presence",
presence_target <- input_json$sheets
for (i in seq_along(presence_target)) {
  field_items <- presence_target[[i]]$field_items
  for (j in seq_along(field_items)) {
    field_item <- field_items[[j]]
    if (field_item$type != "FieldItem::Article") {
      presence_target[[i]]$field_items[[j]]$name <- ""
      next
    }
    validators <- if ("validators" %in% names(field_item)) field_item$validators else NULL
    if (is.null(validators)) {
      presence_target[[i]]$field_items[[j]]$name <- ""
      next
    }
    presence <- "presence" %in% names(validators)
    if (presence) {
      presence_target[[i]]$field_items[[j]]$name <- ""
      next
    }
  }
}
# ieorres, xxstatを除外
for (i in seq_along(presence_target)) {
  presence <- presence_target[[i]]
  cdisc_sheet_configs <- presence$cdisc_sheet_configs
  if (length(cdisc_sheet_configs) == 0) {
    next
  }
  for (j in seq_along(cdisc_sheet_configs)) {
    cdisc_sheet_config <- cdisc_sheet_configs[[j]]
    table <- cdisc_sheet_config$table
    if (cdisc_sheet_config$prefix == "IE") {
      table <- table %>% discard(~ .x == "ORRES")
      presence_target[[i]]$cdisc_sheet_configs[[j]]$table <- table
    }
    table <- table %>% discard(~ .x == "STAT")
    presence_target[[i]]$cdisc_sheet_configs[[j]]$table <- table
  }
}

res <- presence_target %>%
  map(~ {
    res <- .x
    cdisc_sheet_configs <- .x$cdisc_sheet_configs
    field_items <- .x$field_items
    if (length(field_items) == 0) {
      return(NULL)
    }
    table <- cdisc_sheet_configs %>%
      map(~ .x$table) %>%
      unlist()
    if (length(table) == 0) {
      return(NULL)
    }
    target_fields <- names(table) %>% unique()
    res$field_items <- field_items %>% keep(~ .x$name %in% target_fields)
    if (length(res$field_items) == 0) {
      return(NULL)
    }
    return(res)
  }) %>%
  discard(is.null)
output_df <- res %>%
  map(~ {
    fields <- .x$field_items %>%
      map_df(~ tibble(name = .x$name, label = .x$label))
    name_alias_name <- tibble(
      jpname = .x$name,
      alias_name = .x$alias_name
    )
    res <- bind_cols(name_alias_name, fields)
    return(res)
  }) %>%
  bind_rows()
colnames(output_df) <- c("シート名", "シート名英数字別名", "フィールドID", "ラベル")
write_csv(output_df, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_presence.csv")
