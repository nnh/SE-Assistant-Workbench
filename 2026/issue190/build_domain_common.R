library(tidyverse)
library(here)

source(here("generate_random_date.R"))

# specに定義されているがdataにまだ存在しないcdisc_variableを対象変数として抽出
compute_target_vars <- function(data, spec) {
  setdiff(unique(spec[["cdisc_variable"]]), colnames(data))
}

# radio_button: 全codeパターン(codeが無ければdefault_value)からランダムに割り振り。
# required_vars(presence型のvalidatorを持つcdisc_variable)に含まれず、かつis_invisibleがFALSE(可視項目)の場合は
# 必須ではないため、空白("")も選択肢に加える。
# numeric_bounds(cdisc_variable, min_value, max_value)がある場合、数値として範囲外のcodeは選択肢から除く
populate_radio_button_fields <- function(data, spec, target_vars, required_vars = character(0), numeric_bounds = NULL) {
  options_spec <- spec %>% filter(field_type == "radio_button")
  options_spec[["code"]] <- ifelse(is.na(options_spec[["code"]]), options_spec[["default_value"]], options_spec[["code"]])
  options_target_vars <- intersect(unique(options_spec[["cdisc_variable"]]), target_vars)
  for (var_name in options_target_vars) {
    var_rows <- options_spec %>% filter(cdisc_variable == var_name)
    choices <- var_rows %>% pull(code) %>% unique()
    is_visible <- !any(var_rows[["is_invisible"]], na.rm = TRUE)
    if (!(var_name %in% required_vars) && is_visible) {
      choices <- union(choices, "")
    }

    if (!is.null(numeric_bounds)) {
      bound_row <- numeric_bounds %>% filter(cdisc_variable == var_name)
      if (nrow(bound_row) > 0) {
        min_value <- bound_row[["min_value"]][1]
        max_value <- bound_row[["max_value"]][1]
        numeric_choices <- suppressWarnings(as.numeric(choices))
        within_bounds <- is.na(numeric_choices) |
          ((is.na(min_value) | numeric_choices >= min_value) & (is.na(max_value) | numeric_choices <= max_value))
        choices <- choices[within_bounds]
      }
    }

    if (length(choices) > 0) {
      data[[var_name]] <- sample(choices, size = nrow(data), replace = TRUE)
    }
  }
  data
}

# date: registration_start_date〜今日の間でランダムな日付を生成
populate_date_fields <- function(data, spec, target_vars, registration_start_date) {
  date_vars <- spec %>%
    filter(field_type == "date") %>%
    pull(cdisc_variable) %>%
    unique() %>%
    intersect(target_vars)
  for (var_name in date_vars) {
    data <- generate_random_date(data, registration_start_date, Sys.Date(), var_name)
  }
  data
}

# 上記のいずれでも埋まらなかった対象変数はとりあえずダミー値を格納
populate_dummy_fields <- function(data, target_vars) {
  remaining_vars <- setdiff(target_vars, colnames(data))
  for (var_name in remaining_vars) {
    data[[var_name]] <- "DUMMY"
  }
  data
}

# presence_conditions(cdisc_variable, ref_cdisc_variable, expected_value)に基づき、
# ref_cdisc_variableの値がexpected_valueと一致しないレコードのcdisc_variableをNAにする。
# インデックス代入を使うことで、日付型など列の型を問わず安全に適用できる。
# 同じ(cdisc_variable, ref_cdisc_variable)に複数行(expected_valueが複数)ある場合はOR条件として扱う
apply_presence_conditions <- function(data, presence_conditions) {
  applicable <- presence_conditions %>%
    filter(cdisc_variable %in% colnames(data), ref_cdisc_variable %in% colnames(data)) %>%
    group_by(cdisc_variable, ref_cdisc_variable) %>%
    summarise(expected_values = list(unique(expected_value)), .groups = "drop")

  for (i in seq_len(nrow(applicable))) {
    var_name <- applicable[["cdisc_variable"]][i]
    ref_var <- applicable[["ref_cdisc_variable"]][i]
    expected_values <- applicable[["expected_values"]][[i]]
    mismatch <- !(data[[ref_var]] %in% expected_values)
    data[[var_name]][mismatch] <- NA
  }
  data
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

# field_type=="meddra"に該当する変数名を抽出
compute_meddra_vars <- function(spec, target_vars) {
  spec %>%
    filter(field_type == "meddra") %>%
    pull(cdisc_variable) %>%
    unique() %>%
    intersect(target_vars)
}

# meddra変数にLLT名を格納する。default_valueが8桁数字の場合はllt_codeとみなし、
# 対応するllt_nameを固定値として使う。それ以外はmeddra_sampleのllt_nameを使う
populate_meddra_fields <- function(data, spec, meddra_vars, meddra, meddra_sample) {
  for (var_name in meddra_vars) {
    llt_cd <- spec %>%
      filter(field_type == "meddra", cdisc_variable == var_name, str_detect(default_value, "^[0-9]{8}$")) %>%
      pull(default_value) %>%
      unique()
    if (length(llt_cd) == 1) {
      llt_name <- meddra %>% filter(llt_code == llt_cd) %>% pull(llt_name) %>% unique()
      data[[var_name]] <- llt_name[1]
    } else {
      data[[var_name]] <- meddra_sample[["llt_name"]]
    }
  }
  data
}

# MedDRAコーディングブロック(LLT〜SOC)の列名 (例: prefix="MH" -> MHLLT, MHLLTCD, ...)
meddra_coding_cols <- function(prefix) {
  str_c(prefix, c("LLT", "LLTCD", "DECOD", "PTCD", "HLT", "HLTCD", "HLGT", "HLGTCD", "BODSYS", "BDSYCD", "SOC", "SOCCD"))
}

# MedDRAコーディングブロック(LLT〜SOC)を追加。meddra_sampleと同じ階層を使い、コード間の対応関係を保つ
add_meddra_coding_block <- function(data, meddra_sample, prefix) {
  data[[str_c(prefix, "LLT")]] <- meddra_sample[["llt_name"]]
  data[[str_c(prefix, "LLTCD")]] <- meddra_sample[["llt_code"]]
  data[[str_c(prefix, "DECOD")]] <- meddra_sample[["pt_name"]]
  data[[str_c(prefix, "PTCD")]] <- meddra_sample[["pt_code"]]
  data[[str_c(prefix, "HLT")]] <- meddra_sample[["hlt_name"]]
  data[[str_c(prefix, "HLTCD")]] <- meddra_sample[["hlt_code"]]
  data[[str_c(prefix, "HLGT")]] <- meddra_sample[["hlgt_name"]]
  data[[str_c(prefix, "HLGTCD")]] <- meddra_sample[["hlgt_code"]]
  data[[str_c(prefix, "SOC")]] <- meddra_sample[["soc_name"]]
  data[[str_c(prefix, "SOCCD")]] <- meddra_sample[["soc_code"]]
  data[[str_c(prefix, "BODSYS")]] <- meddra_sample[["soc_name"]]
  data[[str_c(prefix, "BDSYCD")]] <- meddra_sample[["soc_code"]]
  data
}

# データセット全体の通番を付与 (xxSEQ)
add_seq <- function(data, seq_var) {
  data %>% mutate(!!seq_var := row_number())
}

# 列順を整理: front_cols -> その他 -> end_cols。存在しない列はエラーにならず無視する
reorder_domain_columns <- function(data, front_cols = character(0), end_cols = character(0)) {
  data %>%
    select(any_of(front_cols), everything(), -any_of(end_cols), any_of(end_cols))
}

# 全ドメイン共通で先頭に固定したい列 (STUDYID, DOMAIN, USUBJID, prefixSEQ, prefixSPID)
# reorder_domain_columns()のfront_colsにそのまま渡す想定。存在しない列は無視される
domain_front_cols <- function(prefix) {
  c("STUDYID", "DOMAIN", "USUBJID", str_c(prefix, "SEQ"), str_c(prefix, "SPID"))
}

# DM/AE/DSのような個別ロジックを持たないドメイン向けの汎用生成。USUBJIDごとに1レコード作り、
# radio_button/date/ダミーの共通パターンで項目を埋め、prefixSEQ(例: CMSEQ)をデータセット全体の通番として、
# prefixSPID(例: CMSPID)にalias_nameをそのまま付与する
build_generic_domain <- function(dm, spec, prefix, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL, add_coding_block = FALSE) {
  data <- dm %>% select(USUBJID, STUDYID)
  data[["DOMAIN"]] <- prefix

  alias_names <- spec[["alias_name"]] %>% unique()
  spid_var <- str_c(prefix, "SPID")
  data[[spid_var]] <- sample(alias_names, size = nrow(data), replace = TRUE)

  target_vars <- compute_target_vars(data, spec)
  seq_var <- str_c(prefix, "SEQ")

  data <- data %>%
    populate_radio_button_fields(spec, target_vars, required_vars, numeric_bounds) %>%
    populate_date_fields(spec, target_vars, registration_start_date) %>%
    populate_dummy_fields(target_vars) %>%
    add_seq(seq_var)

  meddra_vars <- compute_meddra_vars(spec, target_vars)
  coding_cols <- character(0)
  if (length(meddra_vars) > 0) {
    meddra_sample <- sample_meddra_rows(meddra, nrow(data))
    data <- data %>% populate_meddra_fields(spec, meddra_vars, meddra, meddra_sample)
    if (add_coding_block) {
      data <- data %>% add_meddra_coding_block(meddra_sample, prefix)
      coding_cols <- meddra_coding_cols(prefix)
    }
  }

  data <- data %>% apply_presence_conditions(presence_conditions)

  data %>%
    reorder_domain_columns(front_cols = c(domain_front_cols(prefix), meddra_vars, coding_cols))
}

# cdisc_variable_valuesに含まれるprefixのうち、個別ロジックを持つドメイン(既定でDM/AE/DS)を除いた
# 全てについてbuild_generic_domain()を適用し、prefixをキーにした名前付きリストで返す。
# MedDRAコーディングブロック(LLT〜SOC)はcoding_block_prefixes(既定でMH)に該当するドメインのみ付与する
build_other_domains <- function(dm, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL,
                                 exclude_prefixes = c("DM", "AE", "DS"), coding_block_prefixes = c("MH")) {
  prefixes <- setdiff(unique(cdisc_variable_values[["prefix"]]), exclude_prefixes)
  prefixes %>%
    set_names() %>%
    map(function(px) {
      spec <- cdisc_variable_values %>% filter(prefix == px)
      build_generic_domain(dm, spec, px, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, add_coding_block = px %in% coding_block_prefixes)
    })
}
