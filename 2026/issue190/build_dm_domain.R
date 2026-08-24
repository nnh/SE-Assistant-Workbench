library(tidyverse)
library(here)

source(here("constant.R"))
source(here("generate_brthdtc.R"))
source(here("build_domain_common.R"))

# sheet_groupsのうちis_default==TRUEのグループに含まれるsheetのalias_name一覧を返す。
# defaultグループは全被験者が共通して持つシート集合を表す。
# allocation2/3/4のように治療経過の途中(defaultグループに含まれない、特定の群/時点でのみ表示される)の
# 「実施した/しなかった」報告を、無作為化群(ARM)の判定に誤って使わないようにするため
default_sheet_alias_names <- function(sheet_groups) {
  sheet_groups %>%
    keep(~ coalesce(.x[["is_default"]], FALSE)) %>%
    map(~ map_chr(.x[["sheets"]], "alias_name")) %>%
    unlist() %>%
    unique()
}

# sheetsの中にcategory=="allocation"の要素があり、かつdefaultグループのシートに含まれるものがあれば、
# その$allocation$groupsのcode一覧を返す(群あり)。無ければNULL(単群)
extract_allocation_arm_labels <- function(sheets, default_alias_names) {
  allocation_sheets <- sheets %>%
    keep(~ identical(.x[["category"]], "allocation") && .x[["alias_name"]] %in% default_alias_names)
  if (length(allocation_sheets) == 0) {
    return(NULL)
  }
  codes <- allocation_sheets %>%
    map(~ .x[["allocation"]][["groups"]]) %>%
    unlist(recursive = FALSE) %>%
    map_chr(~ .x[["code"]]) %>%
    unique()
  if (length(codes) == 0) {
    return(NULL)
  }
  codes
}

build_dm_domain <- function(sheets, sheet_groups, n = 100) {
  dm <- tibble(
    SITEID = sample(dummy_site$SITEID, n, replace = TRUE),
    SUBJID = str_pad(1:n, width = 4, pad = "0")
  )
  dm[["STUDYID"]] <- "dummy-studyid"
  dm[["DOMAIN"]] <- "DM"
  dm[["USUBJID"]] <- str_c(dm[["STUDYID"]], dm[["SUBJID"]], sep = "-")
  dm <- generate_brthdtc(dm, var_name = "BRTHDTC")

  arm_labels <- extract_allocation_arm_labels(sheets, default_sheet_alias_names(sheet_groups))
  dm[["ARM"]] <- if (is.null(arm_labels)) "" else sample(arm_labels, n, replace = TRUE)

  dm %>% select(STUDYID, DOMAIN, USUBJID, SUBJID, SITEID, BRTHDTC, ARM)
}

populate_dm_domain <- function(dm, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL, field_ref_bounds = NULL, age_bounds = NULL) {
  dm_spec <- cdisc_variable_values %>% filter(prefix == "DM")
  target_vars <- compute_target_vars(dm, dm_spec)

  dm <- dm %>%
    populate_radio_button_fields(dm_spec, target_vars, required_vars, numeric_bounds) %>%
    populate_date_fields(dm_spec, target_vars, registration_start_date) %>%
    populate_dummy_fields(target_vars)

  meddra_vars <- compute_meddra_vars(dm_spec, target_vars)
  if (length(meddra_vars) > 0) {
    meddra_sample <- sample_meddra_rows(meddra, nrow(dm))
    dm <- dm %>% populate_meddra_fields(dm_spec, meddra_vars, meddra, meddra_sample)
  }

  dm %>%
    apply_presence_conditions(presence_conditions) %>%
    apply_field_ref_bounds(dm_spec, field_ref_bounds) %>%
    apply_age_date_bounds(age_bounds, registration_start_date)
}
