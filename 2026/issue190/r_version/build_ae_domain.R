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

populate_ae_domain <- function(ae, cdisc_variable_values, registration_start_date, meddra, presence_conditions, numeric_bounds = NULL, field_ref_bounds = NULL, required_llt_codes = character(0), who_drug_idf = NULL, active_sheet_table = NULL, date_ref_bounds = NULL) {
  ae_spec <- cdisc_variable_values %>% filter(prefix == "AE")

  # レコードごとにalias_nameを割り当てる。active_sheet_table(USUBJID, alias_name)が指定されている場合、
  # その行のUSUBJIDにとって実際に有効な(そのシートが表示される)alias_nameだけから選ぶ
  # (どのalias_nameも有効でない被験者の行は、AE報告自体が存在しないとみなして除外する)
  alias_names <- ae_spec[["alias_name"]] %>% unique()
  if (!is.null(active_sheet_table)) {
    eligible <- active_sheet_table %>% filter(alias_name %in% alias_names)
    eligible_pool <- split(eligible[["alias_name"]], eligible[["USUBJID"]])
    ae[["alias_name"]] <- map_chr(ae[["USUBJID"]], function(usubjid) {
      pool <- eligible_pool[[usubjid]]
      if (is.null(pool) || length(pool) == 0) NA_character_ else sample(pool, 1)
    })
    ae <- ae %>% filter(!is.na(alias_name))
  } else {
    ae[["alias_name"]] <- sample(alias_names, size = nrow(ae), replace = TRUE)
  }

  target_vars <- compute_target_vars(ae, ae_spec)
  ae <- ae %>% populate_radio_button_fields(ae_spec, target_vars, numeric_bounds)

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

  # AE報告が複数のalias(シート、例: "sae_report"/"ae2")にまたがる場合、シートの本来の並び順
  # (sheet_seq)に沿うようalias単位でまとめて日付をシフトする(同じ行のAESTDTC<=AEENDTCの関係は保つ)
  ae <- reorder_dates_by_sheet_seq(ae, ordered_date_vars, ae_spec, registration_start_date)

  # meddra: field_type=="meddra"に該当する変数はLLT名を直接格納し、MedDRAコーディングブロック(LLT〜SOC)を追加
  meddra_vars <- compute_meddra_vars(ae_spec, target_vars)
  meddra_sample <- sample_meddra_rows(meddra, nrow(ae)) %>%
    inject_required_llt_codes(meddra, required_llt_codes)
  ae <- ae %>%
    populate_meddra_fields(ae_spec, meddra_vars, meddra, meddra_sample) %>%
    add_meddra_coding_block(meddra_sample, "AE")

  # "ae"シートのように、AE報告と同じフォーム上に他prefix(例: FA)のブロックがある場合、
  # そのフィールドも同じ行に追加する。presence_conditionsが同じ行内で完結するようにするため、
  # apply_presence_conditionsの前に行う
  linked <- populate_linked_blocks(ae, cdisc_variable_values, "AE", registration_start_date, meddra, who_drug_idf, date_ref_bounds)
  ae <- linked[["data"]]
  linked_spec <- linked[["linked_spec"]]

  # 上記以外のfield_type: とりあえずダミー値を格納
  ae <- ae %>%
    populate_dummy_fields(target_vars) %>%
    apply_presence_conditions(presence_conditions) %>%
    apply_field_ref_bounds(ae_spec, field_ref_bounds)

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
    ungroup()

  # AESEQはUSUBJID・AESTDTC・AESPIDの昇順で振る(同日にAETOXGR=5(死亡)と他のAEがある場合の
  # 前後関係は問わない)
  ae <- ae %>%
    arrange(USUBJID, AESTDTC, AESPID) %>%
    add_seq("AESEQ")

  # populate_linked_blocks()で同じ行に追加した他prefix(例: FA)の列を、対応するドメインの
  # 断片テーブルに分離する(AESPIDをそのままprefixSPIDとして引き継ぎ、どのAE報告に対応するか分かるようにする)。
  # AE自身の返り値には、リンク先prefixの列とalias_nameは含めない
  linked_domains <- split_linked_domains(ae, linked_spec, "AESPID")
  ae <- ae %>% select(-alias_name, -any_of(linked_spec[["cdisc_variable"]] %>% unique()))

  # 列順を整理: STUDYID/DOMAIN/USUBJID/AESEQ/AESPID -> meddra項目 -> MedDRAコーディングブロック -> その他 -> AETOXGR/AESTDTC/AEENDTC
  ae <- ae %>%
    reorder_domain_columns(
      front_cols = c(domain_front_cols("AE"), meddra_vars, meddra_coding_cols("AE")),
      end_cols = c("AETOXGR", "AESTDTC", "AEENDTC")
    )

  list(ae = ae, linked = linked_domains)
}

build_death_date_table <- function(ae) {
  ae %>%
    filter(AETOXGR == "5") %>%
    group_by(USUBJID) %>%
    summarise(DTHDTC = min(AEENDTC), .groups = "drop")
}
