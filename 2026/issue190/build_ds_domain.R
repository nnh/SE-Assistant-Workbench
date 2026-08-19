library(tidyverse)
library(here)

source(here("build_domain_common.R"))

build_ds_domain <- function(dm, cdisc_variable_values) {
  ds_spec <- cdisc_variable_values %>% filter(prefix == "DS")

  # DSEPOCHが存在する場合はそのdefault_value(エポック)ごとに、USUBJID×エポックのレコードを作る。
  # エポックはsheet_seqの昇順に並べ、その順にレコードを積み上げることで
  # 同一USUBJID内での行の並びがシートの登場順(=経過順)と一致するようにする
  if ("DSEPOCH" %in% ds_spec[["cdisc_variable"]]) {
    epochs <- ds_spec %>%
      filter(cdisc_variable == "DSEPOCH") %>%
      distinct(default_value, sheet_seq) %>%
      arrange(sheet_seq) %>%
      pull(default_value)
    ds <- epochs %>%
      map_dfr(~ dm %>% select(USUBJID, STUDYID) %>% mutate(DSEPOCH = .x))
  } else {
    ds <- dm %>% select(USUBJID, STUDYID)
  }

  ds[["DOMAIN"]] <- "DS"
  ds %>% select(STUDYID, DOMAIN, USUBJID, any_of("DSEPOCH"))
}

populate_ds_domain <- function(ds, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL, field_ref_bounds = NULL) {
  ds_spec <- cdisc_variable_values %>% filter(prefix == "DS")
  target_vars <- compute_target_vars(ds, ds_spec)

  ds <- ds %>%
    populate_radio_button_fields(ds_spec, target_vars, required_vars, numeric_bounds) %>%
    populate_date_fields(ds_spec, target_vars, registration_start_date) %>%
    populate_dummy_fields(target_vars) %>%
    add_seq("DSSEQ")

  meddra_vars <- compute_meddra_vars(ds_spec, target_vars)
  if (length(meddra_vars) > 0) {
    meddra_sample <- sample_meddra_rows(meddra, nrow(ds))
    ds <- ds %>% populate_meddra_fields(ds_spec, meddra_vars, meddra, meddra_sample)
  }

  ds <- ds %>%
    apply_presence_conditions(presence_conditions) %>%
    apply_field_ref_bounds(ds_spec, field_ref_bounds)

  ds %>% reorder_domain_columns(front_cols = domain_front_cols("DS"))
}

# DSTERMの最終判定を確定する。death_date(AE由来の死亡日)と矛盾しないようDEATHを設定し、
# 死亡していない被験者は最後のレコードの約completed_rateをCOMPLETEDにする。DSTERMが無ければ何もしない
finalize_ds_disposition <- function(ds, death_date, completed_rate = 0.6) {
  if (!"DSTERM" %in% colnames(ds)) {
    return(ds)
  }

  died_usubjid <- death_date[["USUBJID"]]
  has_dsdtc <- "DSDTC" %in% colnames(ds)

  # 既存のDEATH表記は一旦すべて解除(重複・矛盾を避けるため)
  ds <- ds %>% mutate(DSTERM = if_else(DSTERM == "DEATH", NA_character_, DSTERM))

  ds_with_row_id <- ds %>% mutate(.row_id = row_number())

  # death_dateにある被験者は、最後のレコードをDEATHとして確定させる
  death_row_ids <- ds_with_row_id %>%
    filter(USUBJID %in% died_usubjid) %>%
    group_by(USUBJID) %>%
    slice_tail(n = 1) %>%
    ungroup() %>%
    pull(.row_id)

  ds$DSTERM[death_row_ids] <- "DEATH"
  if (has_dsdtc) {
    dthdtc_map <- death_date$DTHDTC[match(ds$USUBJID[death_row_ids], died_usubjid)]
    ds$DSDTC[death_row_ids] <- dthdtc_map
  }

  # 死亡していない被験者は、最後のレコードの約completed_rateをCOMPLETEDにする
  alive_last_row_ids <- ds_with_row_id %>%
    filter(!(USUBJID %in% died_usubjid)) %>%
    group_by(USUBJID) %>%
    slice_tail(n = 1) %>%
    ungroup() %>%
    pull(.row_id)

  completed_row_ids <- sample(alive_last_row_ids, size = round(length(alive_last_row_ids) * completed_rate))
  completed_usubjid <- ds$USUBJID[completed_row_ids]
  # 最終的にCOMPLETEDとなった被験者は、途中経過のレコードもすべてCOMPLETEDにする
  ds$DSTERM[ds$USUBJID %in% completed_usubjid] <- "COMPLETED"

  ds
}

# USUBJIDごとの中止日テーブルを作る(DSTERM!="COMPLETED"のレコード。DEATHも含む)
# 他ドメイン(EX/LBなど)で中止日以降のレコードが発生していないかのチェックに使う
build_discontinuation_date_table <- function(ds) {
  if (!all(c("DSTERM", "DSDTC") %in% colnames(ds))) {
    return(tibble(USUBJID = character(), DISCONDTC = as.Date(character())))
  }

  ds %>%
    filter(DSTERM != "COMPLETED") %>%
    group_by(USUBJID) %>%
    summarise(DISCONDTC = min(DSDTC), .groups = "drop")
}
