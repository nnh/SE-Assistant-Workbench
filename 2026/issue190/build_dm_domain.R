library(tidyverse)
library(here)

source(here("constant.R"))
source(here("generate_brthdtc.R"))
source(here("build_domain_common.R"))

# sheetsの中にcategory=="allocation"の要素があれば、その$allocation$groupsのlabel一覧を返す(群あり)。
# 無ければNULL(単群)
extract_allocation_arm_labels <- function(sheets) {
  allocation_sheets <- sheets %>% keep(~ identical(.x[["category"]], "allocation"))
  if (length(allocation_sheets) == 0) {
    return(NULL)
  }
  labels <- allocation_sheets %>%
    map(~ .x[["allocation"]][["groups"]]) %>%
    flatten() %>%
    map_chr(~ .x[["label"]]) %>%
    unique()
  if (length(labels) == 0) {
    return(NULL)
  }
  labels
}

build_dm_domain <- function(sheets, n = 100) {
  dm <- tibble(
    SITEID = sample(dummy_site$SITEID, n, replace = TRUE),
    SUBJID = str_pad(1:n, width = 4, pad = "0")
  )
  dm[["STUDYID"]] <- "dummy-studyid"
  dm[["DOMAIN"]] <- "DM"
  dm[["USUBJID"]] <- str_c(dm[["STUDYID"]], dm[["SUBJID"]], sep = "-")
  dm <- generate_brthdtc(dm, var_name = "BRTHDTC")

  arm_labels <- extract_allocation_arm_labels(sheets)
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
