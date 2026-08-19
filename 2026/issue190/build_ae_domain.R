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

# LLTコードを少数に絞り、Zipf的な重みでサンプリングすることで、頻出病名と稀な病名が混在するようにする
# 1レコードにつき1つのLLT〜SOCの階層をまとめて返すため、各コード値の対応関係が崩れない
sample_meddra_rows <- function(meddra, n, pool_size = 20) {
  pool <- meddra %>%
    distinct(llt_code, .keep_all = TRUE) %>%
    slice_sample(n = min(pool_size, n_distinct(meddra[["llt_code"]])))
  weights <- 1 / seq_len(nrow(pool))
  pool[sample(seq_len(nrow(pool)), size = n, replace = TRUE, prob = weights), ]
}

populate_ae_domain <- function(ae, cdisc_variable_values, registration_start_date, meddra) {
  ae_spec <- cdisc_variable_values %>% filter(prefix == "AE")

  # レコードごとにalias_nameを割り当て
  alias_names <- ae_spec[["alias_name"]] %>% unique()
  ae[["alias_name"]] <- sample(alias_names, size = nrow(ae), replace = TRUE)

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

  # meddra: field_type=="meddra"に該当する変数はLLT名を直接格納
  meddra_vars <- ae_spec %>%
    filter(field_type == "meddra") %>%
    pull(cdisc_variable) %>%
    unique() %>%
    intersect(target_vars)
  meddra_sample <- sample_meddra_rows(meddra, nrow(ae))
  for (var_name in meddra_vars) {
    ae[[var_name]] <- meddra_sample[["llt_name"]]
  }

  # MedDRAコーディングブロック(LLT〜SOC)を追加。meddra_sampleと同じ階層を使い、コード間の対応関係を保つ
  ae[["AELLT"]] <- meddra_sample[["llt_name"]]
  ae[["AELLTCD"]] <- meddra_sample[["llt_code"]]
  ae[["AEDECOD"]] <- meddra_sample[["pt_name"]]
  ae[["AEPTCD"]] <- meddra_sample[["pt_code"]]
  ae[["AEHLT"]] <- meddra_sample[["hlt_name"]]
  ae[["AEHLTCD"]] <- meddra_sample[["hlt_code"]]
  ae[["AEHLGT"]] <- meddra_sample[["hlgt_name"]]
  ae[["AEHLGTCD"]] <- meddra_sample[["hlgt_code"]]
  ae[["AESOC"]] <- meddra_sample[["soc_name"]]
  ae[["AESOCCD"]] <- meddra_sample[["soc_code"]]
  ae[["AEBODSYS"]] <- meddra_sample[["soc_name"]]
  ae[["AEBDSYCD"]] <- meddra_sample[["soc_code"]]

  # 上記以外のfield_type: とりあえずダミー値を格納
  remaining_vars <- setdiff(target_vars, colnames(ae))
  for (var_name in remaining_vars) {
    ae[[var_name]] <- "DUMMY"
  }

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

  # AESPIDはUSUBJID内の通番 (例: sae_report1, sae_report2)、AESEQはデータセット全体の通番
  ae <- ae %>%
    group_by(USUBJID) %>%
    mutate(AESPID = str_c(alias_name, row_number())) %>%
    ungroup() %>%
    mutate(AESEQ = row_number())

  ae <- ae %>% select(-alias_name)

  # 列順を整理: STUDYID/DOMAIN/USUBJID/AESEQ/AESPID -> meddra項目 -> MedDRAコーディングブロック -> その他 -> AETOXGR/AESTDTC/AEENDTC
  front_cols <- c("STUDYID", "DOMAIN", "USUBJID", "AESEQ", "AESPID")
  meddra_coding_cols <- c(
    "AELLT", "AELLTCD", "AEDECOD", "AEPTCD", "AEHLT", "AEHLTCD",
    "AEHLGT", "AEHLGTCD", "AEBODSYS", "AEBDSYCD", "AESOC", "AESOCCD"
  )
  end_cols <- c("AETOXGR", "AESTDTC", "AEENDTC")

  ae %>%
    select(
      any_of(front_cols),
      any_of(meddra_vars),
      any_of(meddra_coding_cols),
      everything(), -any_of(end_cols),
      any_of(end_cols)
    )
}

build_death_date_table <- function(ae) {
  ae %>%
    filter(AETOXGR == "5") %>%
    group_by(USUBJID) %>%
    summarise(DTHDTC = min(AEENDTC), .groups = "drop")
}
