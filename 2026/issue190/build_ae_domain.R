library(tidyverse)
library(here)

source(here("build_domain_common.R"))

build_ae_domain <- function(dm, n = 100) {
  ae <- tibble(
    USUBJID = sample(dm[["USUBJID"]], n, replace = TRUE)
  )
  ae <- ae %>% left_join(dm %>% select(USUBJID, STUDYID), by = "USUBJID")
  ae[["DOMAIN"]] <- "AE"

  ae %>% select(STUDYID, DOMAIN, USUBJID)
}

populate_ae_domain <- function(ae, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL) {
  ae_spec <- cdisc_variable_values %>% filter(prefix == "AE")

  # レコードごとにalias_nameを割り当て
  alias_names <- ae_spec[["alias_name"]] %>% unique()
  ae[["alias_name"]] <- sample(alias_names, size = nrow(ae), replace = TRUE)

  target_vars <- compute_target_vars(ae, ae_spec)
  ae <- ae %>% populate_radio_button_fields(ae_spec, target_vars, required_vars, numeric_bounds)

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

  # meddra: field_type=="meddra"に該当する変数はLLT名を直接格納し、MedDRAコーディングブロック(LLT〜SOC)を追加
  meddra_vars <- compute_meddra_vars(ae_spec, target_vars)
  meddra_sample <- sample_meddra_rows(meddra, nrow(ae))
  ae <- ae %>%
    populate_meddra_fields(ae_spec, meddra_vars, meddra, meddra_sample) %>%
    add_meddra_coding_block(meddra_sample, "AE")

  # 上記以外のfield_type: とりあえずダミー値を格納
  ae <- ae %>%
    populate_dummy_fields(target_vars) %>%
    apply_presence_conditions(presence_conditions)

  # USUBJIDごとにAETOXGR=5のレコードが最後になるよう並べ替え
  if ("AETOXGR" %in% colnames(ae)) {
    ae <- ae %>%
      group_by(USUBJID) %>%
      arrange(AETOXGR == "5", .by_group = TRUE) %>%
      ungroup()
  }

  # AETOXGR=5(死亡)のAEENDTCより後に開始する他のAEは矛盾するため除外
  if (all(c("AETOXGR", "AESTDTC", "AEENDTC") %in% colnames(ae))) {
    death_dates <- ae %>%
      filter(AETOXGR == "5") %>%
      group_by(USUBJID) %>%
      summarise(DTHDTC = min(AEENDTC), .groups = "drop")

    ae <- ae %>%
      left_join(death_dates, by = "USUBJID") %>%
      filter(is.na(DTHDTC) | AESTDTC <= DTHDTC) %>%
      select(-DTHDTC)
  }

  # AESPIDはUSUBJID内の通番 (例: sae_report1, sae_report2)
  ae <- ae %>%
    group_by(USUBJID) %>%
    mutate(AESPID = str_c(alias_name, row_number())) %>%
    ungroup() %>%
    add_seq("AESEQ") %>%
    select(-alias_name)

  # 列順を整理: STUDYID/DOMAIN/USUBJID/AESEQ/AESPID -> meddra項目 -> MedDRAコーディングブロック -> その他 -> AETOXGR/AESTDTC/AEENDTC
  ae %>%
    reorder_domain_columns(
      front_cols = c(domain_front_cols("AE"), meddra_vars, meddra_coding_cols("AE")),
      end_cols = c("AETOXGR", "AESTDTC", "AEENDTC")
    )
}

build_death_date_table <- function(ae) {
  ae %>%
    filter(AETOXGR == "5") %>%
    group_by(USUBJID) %>%
    summarise(DTHDTC = min(AEENDTC), .groups = "drop")
}
