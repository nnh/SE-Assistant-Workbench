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

# presence_conditions(cdisc_variable, ref_cdisc_variable, expected_value, condition_type)に基づき、
# 条件を満たさないレコードのcdisc_variableをNAにする。インデックス代入を使うことで、
# 日付型など列の型を問わず安全に適用できる。
# condition_type=="equals": ref_cdisc_variableの値がexpected_value(複数行ならOR)と一致しない場合NAにする
# condition_type=="not_blank": ref_cdisc_variableが空白/NAの場合NAにする(expected_valueは使わない)
apply_presence_conditions <- function(data, presence_conditions) {
  applicable <- presence_conditions %>%
    filter(cdisc_variable %in% colnames(data), ref_cdisc_variable %in% colnames(data))

  equals_conditions <- applicable %>%
    filter(condition_type == "equals") %>%
    group_by(cdisc_variable, ref_cdisc_variable) %>%
    summarise(expected_values = list(unique(expected_value)), .groups = "drop")
  for (i in seq_len(nrow(equals_conditions))) {
    var_name <- equals_conditions[["cdisc_variable"]][i]
    ref_var <- equals_conditions[["ref_cdisc_variable"]][i]
    expected_values <- equals_conditions[["expected_values"]][[i]]
    mismatch <- !(data[[ref_var]] %in% expected_values)
    data[[var_name]][mismatch] <- NA
  }

  not_blank_conditions <- applicable %>%
    filter(condition_type == "not_blank") %>%
    distinct(cdisc_variable, ref_cdisc_variable)
  for (i in seq_len(nrow(not_blank_conditions))) {
    var_name <- not_blank_conditions[["cdisc_variable"]][i]
    ref_var <- not_blank_conditions[["ref_cdisc_variable"]][i]
    mismatch <- is.na(data[[ref_var]]) | data[[ref_var]] == ""
    data[[var_name]][mismatch] <- NA
  }

  data
}

# field_ref_bounds(cdisc_variable, ref_cdisc_variable, bound_type)に基づき、
# cdisc_variableの値がref_cdisc_variableの値との大小関係(max_value/min_value/exact_value)を
# 満たさない場合、条件を満たすradio_button選択肢から選び直す。
# 空白("")や、ref_cdisc_variableが数値でない場合は対象外(そのまま)とする
apply_field_ref_bounds <- function(data, spec, field_ref_bounds) {
  if (is.null(field_ref_bounds) || nrow(field_ref_bounds) == 0) {
    return(data)
  }
  applicable <- field_ref_bounds %>%
    filter(cdisc_variable %in% colnames(data), ref_cdisc_variable %in% colnames(data))

  for (i in seq_len(nrow(applicable))) {
    var_name <- applicable[["cdisc_variable"]][i]
    ref_var <- applicable[["ref_cdisc_variable"]][i]
    bound_type <- applicable[["bound_type"]][i]

    choices <- spec %>%
      filter(cdisc_variable == var_name, field_type == "radio_button") %>%
      mutate(code = ifelse(is.na(code), default_value, code)) %>%
      pull(code) %>%
      unique()
    numeric_choices <- suppressWarnings(as.numeric(choices))
    ref_values <- suppressWarnings(as.numeric(data[[ref_var]]))

    data[[var_name]] <- map2_chr(data[[var_name]], ref_values, function(current, ref_value) {
      if (is.na(current) || current == "" || is.na(ref_value)) {
        return(current)
      }
      valid <- switch(bound_type,
        max_value = choices[!is.na(numeric_choices) & numeric_choices <= ref_value],
        min_value = choices[!is.na(numeric_choices) & numeric_choices >= ref_value],
        exact_value = choices[!is.na(numeric_choices) & numeric_choices == ref_value],
        choices
      )
      if (length(valid) == 0 || current %in% valid) {
        return(current)
      }
      sample(valid, 1)
    })
  }
  data
}

# cdisc_variable_valuesから、cdisc_variable名 -> prefix の対応表を作る
build_cdisc_variable_to_prefix <- function(cdisc_variable_values) {
  cdisc_variable_values %>% distinct(cdisc_variable, prefix)
}

# presence_conditions/field_ref_boundsのうち、cdisc_variableとref_cdisc_variableのprefixが異なる
# (=ドメインをまたぐ参照)行から、(from, to)の依存エッジ一覧を作る。fromはtoに依存する(toを先に生成する必要がある)
build_cross_prefix_edges <- function(presence_conditions, field_ref_bounds, cdisc_variable_to_prefix) {
  bind_rows(
    presence_conditions %>% select(cdisc_variable, ref_cdisc_variable),
    field_ref_bounds %>% select(cdisc_variable, ref_cdisc_variable)
  ) %>%
    distinct() %>%
    left_join(cdisc_variable_to_prefix, by = "cdisc_variable") %>%
    left_join(
      cdisc_variable_to_prefix %>% rename(ref_cdisc_variable = cdisc_variable, ref_prefix = prefix),
      by = "ref_cdisc_variable"
    ) %>%
    filter(!is.na(prefix), !is.na(ref_prefix), prefix != ref_prefix) %>%
    distinct(from = prefix, to = ref_prefix)
}

# prefixes を、edges(from依存toの依存関係)に基づいて依存先が先に来るように並べ替える(トポロジカルソート)。
# 循環参照がある場合は、それ以上並べ替えできない分をそのまま残りの順序で追加する
topo_sort_prefixes <- function(prefixes, edges) {
  edges <- edges %>% filter(from %in% prefixes, to %in% prefixes)
  remaining <- prefixes
  ordered <- character(0)
  while (length(remaining) > 0) {
    ready <- remaining[!vapply(remaining, function(p) any(edges[["from"]] == p & edges[["to"]] %in% remaining), logical(1))]
    if (length(ready) == 0) {
      ordered <- c(ordered, remaining)
      break
    }
    ordered <- c(ordered, ready)
    remaining <- setdiff(remaining, ready)
  }
  ordered
}

# presence_conditions/field_ref_boundsが参照するcdisc_variableのうち、dataにまだ無いものを、
# 既に生成済みのbuilt_domainsから探して結合する(他ドメイン参照)。
# ref_alias_name/ref_label(参照先フィールド自身が属する固定のブロック、例: RSがSCの特定labelを参照する場合)が
# 分かっていればそのインスタンスに固定して結合する(USUBJIDのみ)。
# 無指定(NA)の場合は、両者がalias_name/labelを持てばそれも突き合わせキーにする(同じブロック内の参照)。
# どちらの情報も無ければUSUBJIDのみで結合する(参照元に複数レコードあると最初の1件を使う)。
# 戻り値はlist(data=結合後のdata, injected_cols=このために追加した列名)
inject_cross_domain_refs <- function(data, presence_conditions, field_ref_bounds, built_domains, cdisc_variable_to_prefix) {
  if (is.null(field_ref_bounds)) {
    field_ref_bounds <- tibble(ref_cdisc_variable = character(0))
  }
  ref_instances <- bind_rows(
    presence_conditions %>% select(any_of(c("ref_cdisc_variable", "ref_alias_name", "ref_label"))),
    field_ref_bounds %>% select(any_of("ref_cdisc_variable"))
  ) %>%
    filter(!is.na(ref_cdisc_variable)) %>%
    distinct(ref_cdisc_variable, .keep_all = TRUE)

  injected_cols <- character(0)
  for (i in seq_len(nrow(ref_instances))) {
    ref_var <- ref_instances[["ref_cdisc_variable"]][i]
    ref_alias_name <- if ("ref_alias_name" %in% names(ref_instances)) ref_instances[["ref_alias_name"]][i] else NA_character_
    ref_label <- if ("ref_label" %in% names(ref_instances)) ref_instances[["ref_label"]][i] else NA_character_
    if (ref_var %in% colnames(data)) {
      next
    }
    ref_prefix <- cdisc_variable_to_prefix %>% filter(cdisc_variable == ref_var) %>% pull(prefix) %>% first()
    if (is.na(ref_prefix) || !(ref_prefix %in% names(built_domains))) {
      next
    }
    ref_data <- built_domains[[ref_prefix]]
    if (!(ref_var %in% colnames(ref_data))) {
      next
    }

    if (!is.na(ref_label) && all(c("alias_name", "label") %in% colnames(ref_data))) {
      # 参照先の特定のlabelインスタンスに固定する(参照元自身のlabelとは無関係)
      ref_slice <- ref_data %>%
        filter(alias_name == ref_alias_name, label == ref_label) %>%
        select(USUBJID, !!ref_var) %>%
        distinct(USUBJID, .keep_all = TRUE)
      data <- data %>% left_join(ref_slice, by = "USUBJID")
    } else if (all(c("alias_name", "label") %in% colnames(data)) && all(c("alias_name", "label") %in% colnames(ref_data))) {
      # 同じブロック(参照元自身のlabel)で突き合わせる
      ref_slice <- ref_data %>%
        select(USUBJID, alias_name, label, !!ref_var) %>%
        distinct(USUBJID, alias_name, label, .keep_all = TRUE)
      data <- data %>% left_join(ref_slice, by = c("USUBJID", "alias_name", "label"))
    } else {
      ref_slice <- ref_data %>%
        select(USUBJID, !!ref_var) %>%
        distinct(USUBJID, .keep_all = TRUE)
      data <- data %>% left_join(ref_slice, by = "USUBJID")
    }
    injected_cols <- c(injected_cols, ref_var)
  }
  list(data = data, injected_cols = injected_cols)
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
build_generic_domain <- function(dm, spec, prefix, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL, field_ref_bounds = NULL, add_coding_block = FALSE, built_domains = list(), cdisc_variable_to_prefix = NULL) {
  # presence_conditions/field_ref_boundsは全ドメイン分を含む共通テーブルのため、同じref_cdisc_variableを
  # 別ドメインが別のlabelで参照しているとinject_cross_domain_refs()が混同してしまう。
  # このドメイン自身のcdisc_variableに関する行だけに絞ってから使う
  presence_conditions <- presence_conditions %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  if (!is.null(field_ref_bounds)) {
    field_ref_bounds <- field_ref_bounds %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  }

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

  # presence_conditions/field_ref_boundsが他ドメインの変数を参照している場合、
  # built_domains(既に生成済みのドメイン)から値を結合してから条件を適用し、結合用に追加した列は最後に外す
  injected <- inject_cross_domain_refs(data, presence_conditions, field_ref_bounds, built_domains, cdisc_variable_to_prefix)
  data <- injected[["data"]] %>%
    apply_presence_conditions(presence_conditions) %>%
    apply_field_ref_bounds(spec, field_ref_bounds) %>%
    select(-any_of(injected[["injected_cols"]]))

  data %>%
    reorder_domain_columns(front_cols = c(domain_front_cols(prefix), meddra_vars, coding_cols))
}

# TRのように、同じcdisc_variableが同じalias_name内で複数のlabel(繰り返しフィールド)に対応するドメイン向け。
# USUBJID×(alias_name, label)の組み合わせごとに1レコード作り、各変数は自分のlabelに対応するspec行だけを見て
# 値を生成する(対応するlabelが無ければNAのまま)。radio_button/date/meddra/dummyの基本パターンに対応
build_repeated_domain <- function(dm, spec, prefix, registration_start_date, meddra, presence_conditions, required_vars = character(0), add_coding_block = FALSE, built_domains = list(), cdisc_variable_to_prefix = NULL) {
  # presence_conditionsは全ドメイン分を含む共通テーブルのため、同じref_cdisc_variableを
  # 別ドメインが別のlabelで参照しているとinject_cross_domain_refs()が混同してしまう。
  # このドメイン自身のcdisc_variableに関する行だけに絞ってから使う
  presence_conditions <- presence_conditions %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])

  repeat_units <- spec %>% distinct(alias_name, label) %>% filter(!is.na(label))

  data <- dm %>%
    select(USUBJID, STUDYID) %>%
    tidyr::crossing(repeat_units)
  data[["DOMAIN"]] <- prefix

  spid_var <- str_c(prefix, "SPID")
  data[[spid_var]] <- data[["alias_name"]]

  target_vars <- compute_target_vars(data %>% select(-alias_name, -label), spec)

  # (alias_name, label)ごとにdplyr::filter()/which()で行を探すと「組み合わせ数×行数」のスキャンになり、
  # labelの種類が多いドメインで遅くなる。group_by()のハッシュ化されたグループ処理に任せることで、
  # スキャンを行わずに値を割り振る
  for (var_name in target_vars) {
    var_spec <- spec %>% filter(cdisc_variable == var_name)

    lookup <- var_spec %>%
      group_by(alias_name, label) %>%
      summarise(
        field_type = first(field_type),
        default_value = first(default_value),
        codes = list(unique(ifelse(is.na(code), default_value, code))),
        is_invisible_any = any(is_invisible, na.rm = TRUE),
        .groups = "drop"
      ) %>%
      mutate(codes = map2(codes, is_invisible_any, function(cs, inv) {
        if (!(var_name %in% required_vars) && !inv) union(cs, "") else cs
      }))

    # case_when()は条件に関係なく全分岐のRHSを評価してしまい、labelが一致しないグループで
    # codes=NAのままsample()を呼んでエラーになるため、if/elseで短絡評価する
    data <- data %>%
      left_join(lookup, by = c("alias_name", "label")) %>%
      group_by(alias_name, label) %>%
      mutate(!!var_name := {
        ft <- field_type[1]
        nn <- n()
        if (is.na(ft)) {
          rep(NA_character_, nn)
        } else if (ft == "radio_button") {
          cs <- codes[[1]]
          if (length(cs) > 0) sample(cs, nn, replace = TRUE) else rep(NA_character_, nn)
        } else if (ft == "date") {
          as.character(sample(seq(as.Date(registration_start_date), Sys.Date(), by = "day"), nn, replace = TRUE))
        } else if (ft == "meddra") {
          dv <- default_value[1]
          if (!is.na(dv) && str_detect(dv, "^[0-9]{8}$")) {
            llt_name <- meddra %>% filter(llt_code == dv) %>% pull(llt_name) %>% unique()
            rep(llt_name[1], nn)
          } else {
            sample_meddra_rows(meddra, nn)[["llt_name"]]
          }
        } else {
          rep("DUMMY", nn)
        }
      }) %>%
      ungroup() %>%
      select(-field_type, -default_value, -codes, -is_invisible_any)
  }

  # meddra型の変数がある場合、コーディングブロック(LLT〜SOC)を追加する。
  # field_type=="meddra"に該当しない行(そのlabelにmeddra型の変数が無い行)は、
  # 対応するmeddra_varsの値がNAのままなのでコード列も自動的にNAになる
  coding_cols <- character(0)
  if (add_coding_block) {
    meddra_type_vars <- spec %>%
      filter(field_type == "meddra") %>%
      distinct(cdisc_variable) %>%
      pull(cdisc_variable) %>%
      intersect(colnames(data))
    if (length(meddra_type_vars) > 0) {
      representative_llt_name <- exec(coalesce, !!!as.list(data[meddra_type_vars]))
      llt_lookup <- meddra %>% distinct(llt_name, .keep_all = TRUE)
      meddra_sample <- tibble(llt_name = representative_llt_name) %>% left_join(llt_lookup, by = "llt_name")
      data <- data %>% add_meddra_coding_block(meddra_sample, prefix)
      coding_cols <- meddra_coding_cols(prefix)
    }
  }

  # presence_conditionsが他ドメインの変数を参照している場合、built_domainsから値を結合してから適用し、
  # 結合用に追加した列は最後に外す(alias_name/labelが揃っている場合はそれも突き合わせキーに使う)
  injected <- inject_cross_domain_refs(data, presence_conditions, NULL, built_domains, cdisc_variable_to_prefix)
  data <- injected[["data"]] %>%
    apply_presence_conditions(presence_conditions) %>%
    select(-any_of(injected[["injected_cols"]]))

  # alias_name/labelはここでは落とさない(他ドメインからの参照で突き合わせキーとして使うため)。
  # build_other_domains側で、返り値を作る最後の段階で取り除く
  data %>%
    add_seq(str_c(prefix, "SEQ")) %>%
    reorder_domain_columns(front_cols = c(domain_front_cols(prefix), coding_cols))
}

# 同じalias_name内で同じcdisc_variableが複数のlabelを持つ行が存在するかどうか(TR/LBなどの繰り返し項目判定)
has_repeated_labels <- function(spec) {
  label_counts <- spec %>%
    filter(!is.na(label)) %>%
    distinct(alias_name, cdisc_variable, label) %>%
    count(alias_name, cdisc_variable)
  nrow(label_counts) > 0 && any(label_counts[["n"]] > 1)
}

# cdisc_variable_valuesに含まれるprefixのうち、個別ロジックを持つドメイン(既定でDM/AE/DS)を除いた
# 全てについてbuild_generic_domain()を適用し、prefixをキーにした名前付きリストで返す。
# MedDRAコーディングブロック(LLT〜SOC)はcoding_block_prefixes(既定でMH)に該当するドメインのみ付与する。
# 同じalias_name内でcdisc_variableが複数labelを持つドメイン(TR/LBなど)は、
# ドメインを限定せず自動判定してbuild_repeated_domain()で生成する。
# repeated_prefixesは自動判定に加えて明示的に強制したい場合に使う。
# presence_conditions/field_ref_boundsがドメインをまたいで参照している場合(例: MHOCCURがRSORRESを参照)は、
# 参照先のprefixを先に生成してから参照元を生成するよう順序を並べ替え、既に生成済みのドメイン(built_domains、
# 引数built_domainsでDM/AE/DSなどを追加で渡せる)の値を結合してから条件判定する
build_other_domains <- function(dm, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL, field_ref_bounds = NULL,
                                 exclude_prefixes = c("DM", "AE", "DS"), coding_block_prefixes = c("MH"), repeated_prefixes = character(0), built_domains = list()) {
  prefixes <- setdiff(unique(cdisc_variable_values[["prefix"]]), exclude_prefixes)

  cdisc_variable_to_prefix <- build_cdisc_variable_to_prefix(cdisc_variable_values)
  edges <- build_cross_prefix_edges(presence_conditions, field_ref_bounds, cdisc_variable_to_prefix)
  ordered_prefixes <- topo_sort_prefixes(prefixes, edges)

  for (px in ordered_prefixes) {
    spec <- cdisc_variable_values %>% filter(prefix == px)
    built_domains[[px]] <- if (px %in% repeated_prefixes || has_repeated_labels(spec)) {
      build_repeated_domain(
        dm, spec, px, registration_start_date, meddra, presence_conditions, required_vars,
        add_coding_block = px %in% coding_block_prefixes,
        built_domains = built_domains, cdisc_variable_to_prefix = cdisc_variable_to_prefix
      )
    } else {
      build_generic_domain(
        dm, spec, px, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds,
        add_coding_block = px %in% coding_block_prefixes,
        built_domains = built_domains, cdisc_variable_to_prefix = cdisc_variable_to_prefix
      )
    }
  }

  # built_domainsの中にはalias_name/label(他ドメイン参照の突き合わせキー)が残っている場合があるため、
  # 返り値を作る最後の段階でのみ取り除く
  built_domains[prefixes] %>% map(~ select(.x, -any_of(c("alias_name", "label"))))
}
