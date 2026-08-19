library(tidyverse)
library(here)

source(here("generate_random_date.R"))

build_ae_domain <- function(dm, n = 100) {
  ae <- tibble(
    USUBJID = sample(dm[["USUBJID"]], n, replace = TRUE)
  )
  ae <- ae %>% left_join(dm %>% select(USUBJID, STUDYID), by = "USUBJID")
  ae[["DOMAIN"]] <- "AE"

  ae %>% select(STUDYID, DOMAIN, USUBJID)
}

populate_ae_domain <- function(ae, cdisc_variable_values, registration_start_date) {
  ae_spec <- cdisc_variable_values %>% filter(prefix == "AE")

  # レコードごとにalias_nameを割り当て、USUBJID内での出現順をAESPIDに格納 (例: sae_report1, sae_report2)
  alias_names <- ae_spec[["alias_name"]] %>% unique()
  ae[["alias_name"]] <- sample(alias_names, size = nrow(ae), replace = TRUE)
  ae <- ae %>%
    group_by(USUBJID) %>%
    mutate(AESPID = str_c(alias_name, row_number())) %>%
    ungroup()

  tmp_ae_colnames <- colnames(ae)
  target_vars <- setdiff(unique(ae_spec[["cdisc_variable"]]), tmp_ae_colnames)

  # radio_button: 全codeパターンからランダムに割り振り
  ae_options <- ae_spec %>% filter(field_type == "radio_button")
  ae_options[["code"]] <- ifelse(is.na(ae_options[["code"]]), ae_options[["default_value"]], ae_options[["code"]])
  ae_options_target_vars <- intersect(unique(ae_options[["cdisc_variable"]]), target_vars)
  for (var_name in ae_options_target_vars) {
    choices <- ae_options %>%
      filter(cdisc_variable == var_name) %>%
      pull(code) %>%
      unique()
    if (length(choices) > 0) {
      ae[[var_name]] <- sample(choices, size = nrow(ae), replace = TRUE)
    }
  }

  # date: AESTDTC -> それ以外 -> AEENDTC(AESTDTC以降になるよう制御)の順に生成
  ae_date_vars <- ae_spec %>%
    filter(field_type == "date") %>%
    pull(cdisc_variable) %>%
    unique() %>%
    intersect(target_vars)
  ordered_date_vars <- c(
    intersect("AESTDTC", ae_date_vars),
    setdiff(ae_date_vars, c("AESTDTC", "AEENDTC")),
    intersect("AEENDTC", ae_date_vars)
  )
  for (var_name in ordered_date_vars) {
    if (var_name == "AEENDTC" && "AESTDTC" %in% colnames(ae)) {
      ae <- generate_random_date(ae, "AESTDTC", Sys.Date(), var_name)
    } else {
      ae <- generate_random_date(ae, registration_start_date, Sys.Date(), var_name)
    }
  }

  # meddra: 後日対応のためとりあえずダミー値を格納
  meddra_vars <- ae_spec %>%
    filter(field_type == "meddra") %>%
    pull(cdisc_variable) %>%
    unique() %>%
    intersect(target_vars)
  for (var_name in meddra_vars) {
    ae[[var_name]] <- "DUMMY"
  }

  # 上記以外のfield_type: とりあえずダミー値を格納
  remaining_vars <- setdiff(target_vars, colnames(ae))
  for (var_name in remaining_vars) {
    ae[[var_name]] <- "DUMMY"
  }

  ae
}
