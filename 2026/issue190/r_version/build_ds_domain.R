library(tidyverse)
library(here)

source(here("build_domain_common.R"))

build_ds_domain <- function(dm, cdisc_variable_values) {
  ds_spec <- cdisc_variable_values %>% filter(prefix == "DS")

  # DSEPOCHが存在する場合はそのdefault_value(エポック)ごとに、USUBJID×エポックのレコードを作る。
  # エポックはsheet_seqの昇順に並べ、その順にレコードを積み上げることで
  # 同一USUBJID内での行の並びがシートの登場順(=経過順)と一致するようにする。
  # 出力列名はSDTM標準に合わせてDSEPOCHではなくEPOCHにする。
  # DSSPIDには、そのエポックの元になったシートのalias_nameを入れる。
  # alias_name/labelも保持しておく(他ドメインが「discon」シートのDSTERMのように特定のDSブロックを
  # 参照する場合、inject_cross_domain_refs()がそのインスタンスを正しく特定できるようにするため。
  # 最終的な出力からは、load_edc_spec.R側で他ドメイン生成に使い終わった後に取り除く)
  if ("DSEPOCH" %in% ds_spec[["cdisc_variable"]]) {
    epoch_table <- ds_spec %>%
      filter(cdisc_variable == "DSEPOCH") %>%
      distinct(alias_name, label, default_value, sheet_seq) %>%
      arrange(sheet_seq)
    ds <- epoch_table %>%
      pmap_dfr(function(alias_name, label, default_value, sheet_seq) {
        dm %>% select(USUBJID, STUDYID) %>% mutate(EPOCH = default_value, DSSPID = alias_name, alias_name = alias_name, label = label)
      })
  } else {
    ds <- dm %>% select(USUBJID, STUDYID)
  }

  ds[["DOMAIN"]] <- "DS"
  ds %>% select(STUDYID, DOMAIN, USUBJID, any_of(c("DSSPID", "EPOCH", "alias_name", "label")))
}

populate_ds_domain <- function(ds, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL, field_ref_bounds = NULL, date_ref_bounds = NULL) {
  # DSEPOCHはbuild_ds_domain()側でEPOCHという列名として既に生成済みのため、
  # spec上のcdisc_variable名のままtarget_varsに残ると別列として重複生成されてしまう。ここで除外する
  ds_spec <- cdisc_variable_values %>% filter(prefix == "DS", cdisc_variable != "DSEPOCH")
  target_vars <- compute_target_vars(ds, ds_spec)

  ds_date_vars <- ds_spec %>% filter(field_type == "date") %>% pull(cdisc_variable) %>% unique()

  ds <- ds %>%
    populate_radio_button_fields(ds_spec, target_vars, required_vars, numeric_bounds) %>%
    populate_date_fields(ds_spec, target_vars, registration_start_date, date_ref_bounds) %>%
    # DSが複数のalias(シート、例: "discon"/"withdrawal")にまたがる場合、シートの本来の並び順
    # (sheet_seq)に沿うようalias単位でまとめて日付をシフトする
    reorder_dates_by_sheet_seq(ds_date_vars, ds_spec, registration_start_date) %>%
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
# 死亡していない被験者は最後のレコードの約completed_rateをCOMPLETEDにする。DSTERMが無ければ何もしない。
# cdisc_variable_valuesが渡され、DSTERMの選択肢に"DEATH"を含むalias_name(例: discon)が判別できる場合は、
# そのブロックの行にDEATHを設定する(単に時系列上最後の行に設定すると、DEATHを選択肢に持たない
# 別ブロック(例: allocation/withdrawal)の行になってしまい、DEATHを参照する他ドメインの判定が
# 常に不一致になるため)。判別できない場合は、従来通り各被験者の最後の行に設定する
finalize_ds_disposition <- function(ds, death_date, cdisc_variable_values = NULL, completed_rate = 0.6) {
  if (!"DSTERM" %in% colnames(ds)) {
    return(ds)
  }

  died_usubjid <- death_date[["USUBJID"]]
  has_dsdtc <- "DSDTC" %in% colnames(ds)

  # 既存のDEATH表記は一旦すべて解除(重複・矛盾を避けるため)。どの行が元々DEATHだったかは、
  # 実際には死亡していない被験者がランダムでDEATHを選んでいた場合などに、後で(DEATH以外の
  # 選択肢から)埋め直すために記録しておく
  was_death <- ds[["DSTERM"]] == "DEATH"
  ds <- ds %>% mutate(DSTERM = if_else(DSTERM == "DEATH", NA_character_, DSTERM))

  ds_with_row_id <- ds %>% mutate(.row_id = row_number())

  death_alias_names <- if (!is.null(cdisc_variable_values) && "alias_name" %in% colnames(ds)) {
    cdisc_variable_values %>%
      filter(prefix == "DS", cdisc_variable == "DSTERM", code == "DEATH") %>%
      pull(alias_name) %>%
      unique()
  } else {
    character(0)
  }

  # death_dateにある被験者は、DEATHを選択肢に持つブロック(あれば)の行、無ければ最後のレコードをDEATHとして確定させる
  died_data <- ds_with_row_id %>% filter(USUBJID %in% died_usubjid)
  if (length(death_alias_names) > 0) {
    preferred <- died_data %>% filter(alias_name %in% death_alias_names)
    fallback <- died_data %>% filter(!(USUBJID %in% unique(preferred[["USUBJID"]])))
    death_row_ids <- bind_rows(preferred, fallback) %>%
      group_by(USUBJID) %>%
      slice_tail(n = 1) %>%
      ungroup() %>%
      pull(.row_id)
  } else {
    death_row_ids <- died_data %>%
      group_by(USUBJID) %>%
      slice_tail(n = 1) %>%
      ungroup() %>%
      pull(.row_id)
  }

  ds$DSTERM[death_row_ids] <- "DEATH"
  if (has_dsdtc) {
    dthdtc_map <- death_date$DTHDTC[match(ds$USUBJID[death_row_ids], died_usubjid)]
    ds$DSDTC[death_row_ids] <- dthdtc_map

    # DSDTC(死亡日、AE側の実際の死亡日が根拠)をここで上書きすると、date_ref_boundsが期待する
    # DSDTC>=DSSTDTC(同じ行)の関係が崩れる場合がある(DSSTDTCは死亡日を知らずに生成されているため)。
    # 死亡日は動かせない事実なので、矛盾する場合はDSSTDTC側を死亡日に合わせて引き戻す
    if ("DSSTDTC" %in% colnames(ds)) {
      violates <- !is.na(ds$DSSTDTC[death_row_ids]) & !is.na(dthdtc_map) & ds$DSSTDTC[death_row_ids] > dthdtc_map
      ds$DSSTDTC[death_row_ids][violates] <- dthdtc_map[violates]
    }
  }

  # 元々DEATHだったがdeath_row_idsに選ばれなかった行(実際には死亡していない被験者がランダムで
  # DEATHを選んでいた、または同じ被験者の別ブロックがDEATH行に選ばれた)は、解除されたまま空白になって
  # しまうため、DEATH以外の選択肢から改めて値を入れ直す
  leftover_ids <- setdiff(which(was_death), death_row_ids)
  if (length(leftover_ids) > 0 && !is.null(cdisc_variable_values) && "alias_name" %in% colnames(ds)) {
    dsterm_choices <- cdisc_variable_values %>%
      filter(prefix == "DS", cdisc_variable == "DSTERM") %>%
      mutate(code = if_else(is.na(code), default_value, code)) %>%
      filter(!is.na(code), code != "DEATH") %>%
      distinct(alias_name, code)
    for (row_id in leftover_ids) {
      choices <- dsterm_choices %>% filter(alias_name == ds$alias_name[row_id]) %>% pull(code)
      if (length(choices) > 0) {
        ds$DSTERM[row_id] <- sample(choices, 1)
      }
    }
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

# 割り付け(群)があるUSUBJIDに対して、DSドメインにランダム化のマイルストーンレコード
# (DSCAT="PROTOCOL MILESTONE", DSDECOD/DSTERM="RANDOMIZED")を追加する。
# DM$ARMが全員空("")の場合(単群、割り付けなし)は何もしない。
# ランダム化は同意取得〜適格性確認の直後(初回投与前)に行われるのが一般的なため、
# DSDTCはDMにRFICDTC(同意取得日)があればその数日以内、無ければ登録開始日から数日以内とする。
# 中止日判定(build_discontinuation_date_table)に混ざらないよう、それより後に呼び出すこと
add_randomization_ds_rows <- function(ds, dm, registration_start_date) {
  randomized_usubjid <- dm %>% filter(ARM != "") %>% pull(USUBJID)
  if (length(randomized_usubjid) == 0) {
    return(ds)
  }

  randomization_rows <- dm %>%
    filter(USUBJID %in% randomized_usubjid) %>%
    select(USUBJID, STUDYID, any_of("RFICDTC")) %>%
    mutate(DOMAIN = "DS")

  if ("DSSPID" %in% colnames(ds)) randomization_rows[["DSSPID"]] <- "allocation"
  if ("DSCAT" %in% colnames(ds)) randomization_rows[["DSCAT"]] <- "PROTOCOL MILESTONE"
  if ("DSDECOD" %in% colnames(ds)) randomization_rows[["DSDECOD"]] <- "RANDOMIZED"
  if ("DSTERM" %in% colnames(ds)) randomization_rows[["DSTERM"]] <- "RANDOMIZED"
  if ("DSDTC" %in% colnames(ds)) {
    n <- nrow(randomization_rows)
    if ("RFICDTC" %in% colnames(randomization_rows)) {
      base_date <- as.Date(randomization_rows[["RFICDTC"]])
      base_date[is.na(base_date)] <- as.Date(registration_start_date)
      offset <- sample(0:3, n, replace = TRUE)
    } else {
      base_date <- as.Date(registration_start_date)
      offset <- sample(0:7, n, replace = TRUE)
    }
    # RFICDTCが今日に近い被験者だと、オフセットを足した結果が未来日になり得るため、今日でクランプする
    randomization_rows[["DSDTC"]] <- as(pmin(base_date + offset, Sys.Date()), class(ds[["DSDTC"]]))
  }
  randomization_rows <- randomization_rows %>% select(-any_of("RFICDTC"))

  bind_rows(randomization_rows, ds) %>%
    add_seq("DSSEQ") %>%
    reorder_domain_columns(front_cols = domain_front_cols("DS"))
}

# USUBJIDごとの中止日テーブルを作る(DSTERM!="COMPLETED"のレコード。DEATHも含む)。
# RANDOMIZED(add_randomization_ds_rows()が追加する無作為化マイルストーン行)も、中止理由ではなく
# 通常は治療開始前の早い日付のため除外する(呼び出し側がadd_randomization_ds_rows()より後のds
# (RANDOMIZED行を含む)を渡してしまっても、無作為化日が誤って中止日として扱われないようにするため)。
# 他ドメイン(EX/LBなど)で中止日以降のレコードが発生していないかのチェックに使う
build_discontinuation_date_table <- function(ds) {
  if (!all(c("DSTERM", "DSDTC") %in% colnames(ds))) {
    return(tibble(USUBJID = character(), DISCONDTC = as.Date(character())))
  }

  ds %>%
    filter(!(DSTERM %in% c("COMPLETED", "RANDOMIZED"))) %>%
    group_by(USUBJID) %>%
    summarise(DISCONDTC = min(DSDTC), .groups = "drop")
}
