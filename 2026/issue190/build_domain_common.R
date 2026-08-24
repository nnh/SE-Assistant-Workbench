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
# numeric_bounds(cdisc_variable, min_value, max_value)がある場合、数値として範囲外のcodeは選択肢から除く。
# dataにalias_name列がある場合(build_generic_domainなど)は、同じcdisc_variableでも
# 定義しているalias_nameが違えばcodeを混ぜず、そのalias_nameの行だけ自分のcodeから選ぶ
populate_radio_button_fields <- function(data, spec, target_vars, required_vars = character(0), numeric_bounds = NULL) {
  options_spec <- spec %>% filter(field_type == "radio_button")
  options_spec[["code"]] <- ifelse(is.na(options_spec[["code"]]), options_spec[["default_value"]], options_spec[["code"]])
  options_target_vars <- intersect(unique(options_spec[["cdisc_variable"]]), target_vars)
  has_alias_name <- "alias_name" %in% colnames(data)

  build_choices <- function(rows, var_name) {
    choices <- rows %>% pull(code) %>% unique()
    is_visible <- !any(rows[["is_invisible"]], na.rm = TRUE)
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
    choices
  }

  for (var_name in options_target_vars) {
    var_rows <- options_spec %>% filter(cdisc_variable == var_name)

    if (has_alias_name) {
      data[[var_name]] <- NA_character_
      for (an in unique(var_rows[["alias_name"]])) {
        choices <- build_choices(var_rows %>% filter(alias_name == an), var_name)
        target <- data[["alias_name"]] == an
        if (length(choices) > 0 && any(target)) {
          data[[var_name]][target] <- sample(choices, size = sum(target), replace = TRUE)
        }
      }
    } else {
      choices <- build_choices(var_rows, var_name)
      if (length(choices) > 0) {
        data[[var_name]] <- sample(choices, size = nrow(data), replace = TRUE)
      }
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

# 変数名が"DOSE"で終わる場合(例: CMDOSE, ECDOSE)、それらしい用量の数値を入れる
dose_value_choices <- c("50", "100", "150", "200", "250", "300", "400", "500")

populate_dose_fields <- function(data, target_vars) {
  dose_vars <- target_vars[str_detect(target_vars, "DOSE$")] %>% setdiff(colnames(data))
  for (var_name in dose_vars) {
    data[[var_name]] <- sample(dose_value_choices, size = nrow(data), replace = TRUE)
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
# condition_type=="copy": cdisc_variableの値をref_cdisc_variableの値でそのまま上書きする
# (FieldItem::Referenceのような「他フィールドの値をそのまま使う」項目向け)
apply_presence_conditions <- function(data, presence_conditions) {
  applicable <- presence_conditions %>%
    filter(cdisc_variable %in% colnames(data), ref_cdisc_variable %in% colnames(data))

  # copyは先に適用する。同じcdisc_variableにequals/not_blankのゲーティング条件も併せて
  # 存在する場合(例: FAOBJがAETERMをコピーしつつ、AELLTCDが特定コードのときだけ値を持つ)、
  # 先にコピーしてから後段のゲーティングでNA化できるようにするため
  copy_conditions <- applicable %>%
    filter(condition_type == "copy") %>%
    distinct(cdisc_variable, ref_cdisc_variable)
  for (i in seq_len(nrow(copy_conditions))) {
    var_name <- copy_conditions[["cdisc_variable"]][i]
    ref_var <- copy_conditions[["ref_cdisc_variable"]][i]
    data[[var_name]] <- data[[ref_var]]
  }

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

# age_bounds(cdisc_variable, ref_cdisc_variable, min_age, max_age)に基づき、
# cdisc_variable(日付)をref_cdisc_variable(日付)からの経過年数がmin_age〜max_ageに収まるよう
# 生成し直す(片方だけ、あるいは両方無い場合もある)。生成範囲はregistration_start_date〜今日にも収める。
# ref_cdisc_variableがNA、またはcdisc_variableが既にNA(そのlabelに存在しない等)の行は変更しない
apply_age_date_bounds <- function(data, age_bounds, registration_start_date) {
  if (is.null(age_bounds) || nrow(age_bounds) == 0) {
    return(data)
  }
  applicable <- age_bounds %>%
    filter(cdisc_variable %in% colnames(data), ref_cdisc_variable %in% colnames(data))

  for (i in seq_len(nrow(applicable))) {
    var_name <- applicable[["cdisc_variable"]][i]
    ref_var <- applicable[["ref_cdisc_variable"]][i]
    min_age <- applicable[["min_age"]][i]
    max_age <- applicable[["max_age"]][i]

    ref_dates <- as.Date(data[[ref_var]])
    raw_lower <- if (!is.na(min_age)) ref_dates + round(min_age * 365.25) else as.Date(registration_start_date)
    raw_upper <- if (!is.na(max_age)) ref_dates + round(max_age * 365.25) else Sys.Date()

    # registration_start_date〜今日でクランプすると逆転してしまう行(高齢のため年齢条件と
    # 登録期間が両立しない等)は、年齢条件を優先してクランプせずそのまま使う
    lower <- pmax(raw_lower, as.Date(registration_start_date))
    upper <- pmin(raw_upper, Sys.Date())
    invalid <- lower > upper
    lower[invalid] <- raw_lower[invalid]
    upper[invalid] <- raw_upper[invalid]
    upper <- pmax(upper, lower)

    current <- data[[var_name]]
    target <- !is.na(current) & !is.na(ref_dates)
    if (any(target)) {
      new_dates <- as.Date(runif(sum(target), as.numeric(lower[target]), as.numeric(upper[target])), origin = "1970-01-01")
      data[[var_name]][target] <- new_dates
    }
  }
  data
}

# cdisc_variable_valuesから、cdisc_variable名 -> prefix の対応表を作る。
# MedDRAコーディングブロックの列(例: AELLTCD)はEDC仕様(cdisc_variable_values)には存在せず
# add_meddra_coding_block()でこちらが独自に追加する列のため、この対応表にも明示的に加えておく
# (そうしないとinject_cross_domain_refs()がprefixを解決できず、これらの列を参照する
# presence_conditions等が他ドメインから結合されないまま無視されてしまう)
build_cdisc_variable_to_prefix <- function(cdisc_variable_values) {
  base <- cdisc_variable_values %>% distinct(cdisc_variable, prefix)
  prefixes <- unique(cdisc_variable_values[["prefix"]])
  coding_block <- prefixes %>% map_dfr(~ tibble(prefix = .x, cdisc_variable = meddra_coding_cols(.x)))
  bind_rows(base, coding_block) %>% distinct(cdisc_variable, prefix)
}

# presence_conditions/field_ref_boundsのうち、cdisc_variableとref_cdisc_variableのprefixが異なる
# (=ドメインをまたぐ参照)行から、(from, to)の依存エッジ一覧を作る。fromはtoに依存する(toを先に生成する必要がある)
build_cross_prefix_edges <- function(presence_conditions, field_ref_bounds, cdisc_variable_to_prefix, age_bounds = NULL) {
  if (is.null(age_bounds)) {
    age_bounds <- tibble(cdisc_variable = character(0), ref_cdisc_variable = character(0))
  }
  bind_rows(
    presence_conditions %>% select(cdisc_variable, ref_cdisc_variable),
    field_ref_bounds %>% select(cdisc_variable, ref_cdisc_variable),
    age_bounds %>% select(cdisc_variable, ref_cdisc_variable)
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
#
# 同じref_cdisc_variableに対して複数の異なる(ref_alias_name, ref_label)の組み合わせがある場合
# (例: DDORRESが、discon由来の行はdiscon自身のDSTERM、withdrawal由来の行はwithdrawal自身のDSTERMを
# それぞれ参照する、という"同じ変数名だが参照元シートごとに別インスタンス"のケース)、
# 各組み合わせをdataの該当行(dataのalias_nameがそのref_alias_nameと一致する行)だけに絞って注入する。
# dataがalias_nameを持たない場合や、そのref_alias_nameがdata自身のalias_nameのどれとも一致しない場合
# (=真に外部の固定参照)は、全行に対して適用する
# 戻り値はlist(data=結合後のdata, injected_cols=このために追加した列名)
inject_cross_domain_refs <- function(data, presence_conditions, field_ref_bounds, built_domains, cdisc_variable_to_prefix, age_bounds = NULL) {
  if (is.null(field_ref_bounds)) {
    field_ref_bounds <- tibble(ref_cdisc_variable = character(0))
  }
  if (is.null(age_bounds)) {
    age_bounds <- tibble(ref_cdisc_variable = character(0))
  }
  ref_instances <- bind_rows(
    presence_conditions %>% select(any_of(c("ref_cdisc_variable", "ref_alias_name", "ref_label"))),
    field_ref_bounds %>% select(any_of("ref_cdisc_variable")),
    age_bounds %>% select(any_of(c("ref_cdisc_variable", "ref_alias_name", "ref_label")))
  ) %>%
    filter(!is.na(ref_cdisc_variable)) %>%
    distinct()
  if (!("ref_alias_name" %in% names(ref_instances))) {
    ref_instances[["ref_alias_name"]] <- NA_character_
  }
  if (!("ref_label" %in% names(ref_instances))) {
    ref_instances[["ref_label"]] <- NA_character_
  }

  # target_rows(pinごとの行の絞り込み)にはdataのalias_name列だけあれば十分(labelは不要。
  # build_generic_domain由来のdataはlabel列を持たないため、labelまで要求すると絞り込みが常に無効化されてしまう)。
  # 一方、has_data_alias(同じブロックのlabelで突き合わせるフォールバック)はalias_nameとlabelの両方が必要
  has_data_alias_name <- "alias_name" %in% colnames(data)
  has_data_alias <- all(c("alias_name", "label") %in% colnames(data))
  data_alias_names <- if (has_data_alias_name) unique(data[["alias_name"]]) else character(0)

  injected_cols <- character(0)
  for (ref_var in unique(ref_instances[["ref_cdisc_variable"]])) {
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
    has_ref_alias <- all(c("alias_name", "label") %in% colnames(ref_data))

    # 型をref_data側に合わせた全NA列を用意し、pinごとに該当行だけ値を埋めていく
    result_col <- ref_data[[ref_var]][rep(NA_integer_, nrow(data))]

    pins <- ref_instances %>% filter(ref_cdisc_variable == ref_var) %>% distinct(ref_alias_name, ref_label)
    for (i in seq_len(nrow(pins))) {
      pin_alias <- pins[["ref_alias_name"]][i]
      pin_label <- pins[["ref_label"]][i]

      # このpinを適用する対象行: dataがalias_nameを持ち、そのpinのref_alias_nameが
      # data自身のalias_nameのいずれかと一致するならその行だけに絞る。一致しない(またはalias_name不明)なら
      # 真に外部の固定参照とみなして全行を対象にする
      target_rows <- if (has_data_alias_name && !is.na(pin_alias) && pin_alias %in% data_alias_names) {
        data[["alias_name"]] == pin_alias
      } else {
        rep(TRUE, nrow(data))
      }
      if (!any(target_rows)) {
        next
      }

      if (!is.na(pin_label) && has_ref_alias) {
        # 参照先の特定のlabelインスタンスに固定する(参照元自身のlabelとは無関係)
        ref_slice <- ref_data %>%
          filter(alias_name == pin_alias, label == pin_label) %>%
          select(USUBJID, !!ref_var) %>%
          distinct(USUBJID, .keep_all = TRUE)
        value_map <- set_names(ref_slice[[ref_var]], ref_slice[["USUBJID"]])
        result_col[target_rows] <- value_map[data[["USUBJID"]][target_rows]]
      } else if (has_data_alias && has_ref_alias) {
        # labelが不明(同じブロック内の述語参照など): 参照元自身の(alias_name, label)で突き合わせる
        ref_slice <- ref_data %>%
          select(USUBJID, alias_name, label, !!ref_var) %>%
          distinct(USUBJID, alias_name, label, .keep_all = TRUE)
        matched <- data[target_rows, ] %>%
          select(USUBJID, alias_name, label) %>%
          left_join(ref_slice, by = c("USUBJID", "alias_name", "label"))
        result_col[target_rows] <- matched[[ref_var]]
      } else {
        ref_slice <- ref_data %>%
          select(USUBJID, !!ref_var) %>%
          distinct(USUBJID, .keep_all = TRUE)
        value_map <- set_names(ref_slice[[ref_var]], ref_slice[["USUBJID"]])
        result_col[target_rows] <- value_map[data[["USUBJID"]][target_rows]]
      }
    }

    data[[ref_var]] <- result_col
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

# meddra_sample(1行=1つのLLT〜SOC階層)の一部の行を、required_llt_codes(必ずデータに含めたいLLTコード)の
# 値で上書きする。コードごとに1行を選び、そのLLTコードに対応する階層一式に丸ごと差し替える。
# required_llt_codesが空、meddra_sampleが0行、または該当コードがmeddraに存在しない場合は何もしない(そのコードは無視される)
inject_required_llt_codes <- function(meddra_sample, meddra, required_llt_codes) {
  required_llt_codes <- required_llt_codes[!is.na(required_llt_codes) & required_llt_codes != ""]
  if (length(required_llt_codes) == 0 || nrow(meddra_sample) == 0) {
    return(meddra_sample)
  }
  n <- nrow(meddra_sample)
  target_rows <- sample(seq_len(n), size = length(required_llt_codes), replace = length(required_llt_codes) > n)
  for (i in seq_along(required_llt_codes)) {
    hierarchy_row <- meddra %>% filter(llt_code == required_llt_codes[i])
    if (nrow(hierarchy_row) == 0) {
      next
    }
    meddra_sample[target_rows[i], ] <- hierarchy_row[1, ]
  }
  meddra_sample
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

# field_type=="drug"に該当する変数名を抽出
compute_drug_vars <- function(spec, target_vars) {
  spec %>%
    filter(field_type == "drug") %>%
    pull(cdisc_variable) %>%
    unique() %>%
    intersect(target_vars)
}

# drug_vars(field_type=="drug"な変数)のspec行が、1つでもdefault_value(固定コード)無し
# (=ランダムサンプリングされ、実際にwho_drug_idfとの一致を確認する意味がある)場合はTRUE。
# 全て固定コードで値が確定している場合はFALSE(この場合、xxDECOD列は生成しない)
drug_vars_need_decod <- function(spec, drug_vars) {
  drug_rows <- spec %>% filter(field_type == "drug", cdisc_variable %in% drug_vars)
  any(is.na(drug_rows[["default_value"]]) | drug_rows[["default_value"]] == "")
}

# drug変数に薬剤名を格納する。default_valueが数値の場合はwho_drug_idf$drug_codeとみなし、
# 対応するfull_name_enを固定値として使う。それ以外はwho_drug_idf$full_name_enからランダムにサンプリングする。
# 同じcdisc_variableでも、field_type=="drug"と定義されているalias_nameの行だけを対象にする
# (同じcdisc_variableが別のalias_nameでは固定値/別のfield_typeとして定義されている場合、その行は変更しない)
populate_drug_fields <- function(data, spec, drug_vars, who_drug_idf) {
  drug_names <- who_drug_idf[["full_name_en"]] %>% discard(is.na) %>% unique()
  if (length(drug_names) == 0) {
    return(data)
  }
  for (var_name in drug_vars) {
    drug_spec_rows <- spec %>% filter(field_type == "drug", cdisc_variable == var_name)
    for (an in unique(drug_spec_rows[["alias_name"]])) {
      target <- data[["alias_name"]] == an
      if (!any(target)) {
        next
      }
      default_value <- drug_spec_rows %>% filter(alias_name == an) %>% pull(default_value) %>% discard(~ is.na(.x) | .x == "") %>% unique()
      fixed_name <- if (length(default_value) == 1 && str_detect(default_value, "^[0-9]+$")) {
        who_drug_idf %>% filter(drug_code == default_value) %>% pull(full_name_en) %>% discard(is.na) %>% unique()
      } else {
        character(0)
      }
      if (length(fixed_name) >= 1) {
        data[[var_name]][target] <- fixed_name[1]
      } else {
        data[[var_name]][target] <- sample(drug_names, size = sum(target), replace = TRUE)
      }
    }
  }
  data
}

# drug変数の値がwho_drug_idf$full_name_enに完全一致する場合、対応するgeneric_name_enを
# prefixDECOD(例: CMDECOD)に格納する(一致しない場合はNA)。field_type=="drug"と定義されている
# alias_nameの行だけを対象にする(他のalias_nameの値がたまたま薬剤名と一致しても対象にしない)。
# drug_varsが複数ある場合は、最初に一致した変数の値を採用する
add_drug_decod <- function(data, spec, drug_vars, who_drug_idf, prefix) {
  if (length(drug_vars) == 0) {
    return(data)
  }
  lookup <- who_drug_idf %>%
    filter(!is.na(full_name_en)) %>%
    distinct(full_name_en, .keep_all = TRUE)

  decod_var <- str_c(prefix, "DECOD")
  data[[decod_var]] <- drug_vars %>%
    map(function(var_name) {
      drug_alias_names <- spec %>% filter(field_type == "drug", cdisc_variable == var_name) %>% pull(alias_name) %>% unique()
      is_drug_row <- data[["alias_name"]] %in% drug_alias_names
      matched <- lookup[["generic_name_en"]][match(data[[var_name]], lookup[["full_name_en"]])]
      if_else(is_drug_row, matched, NA_character_)
    }) %>%
    reduce(coalesce)
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

# alias_nameがmulti_record_alias_names(sheetsのcategoryが"ae_report"または"multiple"のalias_name一覧)に
# 該当する行だけ、AEドメインと同じ形式(alias_name + USUBJID内の連番、例: concomitant_drug1)でSPIDを
# 付与し直す。該当しない行のSPIDは変更しない
apply_multi_record_spid <- function(data, spid_var, multi_record_alias_names) {
  if (length(multi_record_alias_names) == 0 || !("alias_name" %in% colnames(data))) {
    return(data)
  }
  # USUBJID×alias_nameでグループ化することで、連番はalias_nameごとに独立してリセットされる
  # (対象のalias_nameが複数あっても互いに混ざらない)
  data %>%
    group_by(USUBJID, alias_name) %>%
    mutate(!!spid_var := if (alias_name[1] %in% multi_record_alias_names) str_c(alias_name, row_number()) else .data[[spid_var]]) %>%
    ungroup()
}

# visit_lookup(alias_name, VISIT, VISITNUM)をalias_nameで結合し、VISIT/VISITNUM列を追加する。
# category=="visit"のシート由来でない行(一致しない行)はNAのまま
add_visit_columns <- function(data, visit_lookup) {
  if (is.null(visit_lookup) || nrow(visit_lookup) == 0 || !("alias_name" %in% colnames(data))) {
    return(data)
  }
  data <- data %>% left_join(visit_lookup, by = "alias_name")
  # このドメインにvisitカテゴリのシート由来の行が1件も無ければ(全行NA)、
  # 意味の無い空列を出さないようVISIT/VISITNUM列自体を削除する
  if (all(is.na(data[["VISIT"]]))) {
    data <- data %>% select(-VISIT, -VISITNUM)
  }
  data
}

# gated_vars(presence_conditionsで条件付けされている変数)が全てNAの行を除外する。
# DD(死因)のように、DDTEST/DDTESTCDのような固定値の列は常に埋まっているため、
# 「ドメインの全列がNA」ではなく「条件付きの列(例: DDORRES)が全てNA」で判定する必要がある。
# gated_varsが空、またはdomainに1つも存在しない場合は何もしない
drop_empty_domain_rows <- function(domain, gated_vars) {
  gated_vars <- intersect(gated_vars, colnames(domain))
  if (length(gated_vars) == 0) {
    return(domain)
  }
  all_na <- domain %>% select(all_of(gated_vars)) %>% apply(1, function(row) all(is.na(row)))
  domain[!all_na, ]
}

# candidates(USUBJID, alias_name)の各USUBJIDについて、1つのalias_nameを選ぶ。
# presence_conditions(このドメイン自身のcdisc_variableに絞り込み済み)から、候補のalias_nameが
# 実際にゲーティング条件を満たす(=値が入る)ものであれば、それを優先して選ぶ
# (例: DD(死因)がdiscon/withdrawalのどちらかを選ぶ際、実際にDSTERM=="DEATH"になっている方を選ぶことで、
# ランダムに無関係な方を選んでしまい値が常にNAになる、という事態を避ける)。
# 条件を満たす候補が無い、またはpresence_conditionsに該当するequals条件が無い場合はランダムに1つ選ぶ
resolve_preferred_alias_name <- function(candidates, presence_conditions, built_domains, cdisc_variable_to_prefix) {
  equals_conditions <- presence_conditions %>%
    filter(condition_type == "equals", !is.na(ref_alias_name))

  if (nrow(equals_conditions) == 0) {
    return(
      candidates %>%
        group_by(USUBJID) %>%
        slice_sample(n = 1) %>%
        ungroup()
    )
  }

  satisfied <- equals_conditions %>%
    group_by(ref_cdisc_variable, ref_alias_name, ref_label) %>%
    summarise(expected_values = list(unique(expected_value)), .groups = "drop") %>%
    pmap_dfr(function(ref_cdisc_variable, ref_alias_name, ref_label, expected_values) {
      ref_prefix <- cdisc_variable_to_prefix %>% filter(cdisc_variable == ref_cdisc_variable) %>% pull(prefix) %>% first()
      if (is.na(ref_prefix) || is.null(built_domains) || !(ref_prefix %in% names(built_domains))) {
        return(tibble())
      }
      ref_data <- built_domains[[ref_prefix]]
      if (!all(c("USUBJID", ref_cdisc_variable) %in% colnames(ref_data))) {
        return(tibble())
      }
      ref_slice <- if (all(c("alias_name", "label") %in% colnames(ref_data)) && !is.na(ref_label)) {
        ref_data %>% filter(alias_name == ref_alias_name, label == ref_label)
      } else {
        ref_data
      }
      ref_slice %>%
        filter(.data[[ref_cdisc_variable]] %in% expected_values) %>%
        distinct(USUBJID) %>%
        mutate(alias_name = ref_alias_name)
    })

  if (nrow(satisfied) == 0) {
    return(
      candidates %>%
        group_by(USUBJID) %>%
        slice_sample(n = 1) %>%
        ungroup()
    )
  }

  candidates %>%
    left_join(satisfied %>% mutate(.satisfied = TRUE) %>% distinct(USUBJID, alias_name, .satisfied), by = c("USUBJID", "alias_name")) %>%
    mutate(.satisfied = coalesce(.satisfied, FALSE)) %>%
    group_by(USUBJID) %>%
    group_modify(~ {
      pool <- if (any(.x[[".satisfied"]])) filter(.x, .satisfied) else .x
      slice_sample(pool, n = 1)
    }) %>%
    ungroup() %>%
    select(-.satisfied)
}

# DM/AE/DSのような個別ロジックを持たないドメイン向けの汎用生成。
# alias_nameがmulti_record_alias_namesに該当しない場合はUSUBJIDごとに1レコード、
# 該当する場合(AE報告のように被験者ごとに複数件記録されうるシート)はAEドメインと同様、
# 被験者に対してランダムな件数(0件を含む)のレコードを作る。
# radio_button/date/ダミーの共通パターンで項目を埋め、prefixSEQ(例: CMSEQ)をデータセット全体の通番として、
# prefixSPID(例: CMSPID)にalias_name(該当する場合はUSUBJID×alias_name内の連番付き)を付与する
build_generic_domain <- function(dm, spec, prefix, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL, field_ref_bounds = NULL, add_coding_block = FALSE, built_domains = list(), cdisc_variable_to_prefix = NULL, age_bounds = NULL, multi_record_alias_names = character(0), who_drug_idf = NULL, active_sheet_table = NULL, visit_lookup = NULL) {
  # presence_conditions/field_ref_bounds/age_boundsは全ドメイン分を含む共通テーブルのため、同じref_cdisc_variableを
  # 別ドメインが別のlabelで参照しているとinject_cross_domain_refs()が混同してしまう。
  # このドメイン自身のcdisc_variableに関する行だけに絞ってから使う
  presence_conditions <- presence_conditions %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  if (!is.null(field_ref_bounds)) {
    field_ref_bounds <- field_ref_bounds %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  }
  if (!is.null(age_bounds)) {
    age_bounds <- age_bounds %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  }

  alias_names <- spec[["alias_name"]] %>% unique()
  single_alias_names <- setdiff(alias_names, multi_record_alias_names)
  multi_alias_names <- intersect(alias_names, multi_record_alias_names)

  # active_sheet_table(USUBJID, alias_name)が指定されている場合、被験者ごとに実際に有効な
  # (=そのシートが表示される)alias_nameだけを対象にする。指定が無い場合は全alias_nameを対象にする(従来通り)
  single_rows <- if (length(single_alias_names) > 0) {
    candidates <- if (!is.null(active_sheet_table)) {
      active_sheet_table %>% filter(alias_name %in% single_alias_names)
    } else {
      tidyr::crossing(USUBJID = dm[["USUBJID"]], alias_name = single_alias_names)
    }
    resolve_preferred_alias_name(candidates, presence_conditions, built_domains, cdisc_variable_to_prefix)
  } else {
    tibble(USUBJID = character(0), alias_name = character(0))
  }

  multi_rows <- if (length(multi_alias_names) > 0) {
    multi_alias_names %>%
      map_dfr(function(an) {
        eligible_usubjids <- if (!is.null(active_sheet_table)) {
          active_sheet_table %>% filter(alias_name == an) %>% pull(USUBJID) %>% unique()
        } else {
          dm[["USUBJID"]]
        }
        if (length(eligible_usubjids) == 0) {
          return(tibble(USUBJID = character(0), alias_name = character(0)))
        }
        tibble(USUBJID = sample(eligible_usubjids, size = length(eligible_usubjids), replace = TRUE), alias_name = an)
      })
  } else {
    tibble(USUBJID = character(0), alias_name = character(0))
  }

  data <- bind_rows(single_rows, multi_rows) %>%
    left_join(dm %>% select(USUBJID, STUDYID), by = "USUBJID")
  data[["DOMAIN"]] <- prefix

  spid_var <- str_c(prefix, "SPID")
  data[[spid_var]] <- data[["alias_name"]]
  data <- data %>% apply_multi_record_spid(spid_var, multi_record_alias_names)

  target_vars <- compute_target_vars(data %>% select(-alias_name), spec)
  seq_var <- str_c(prefix, "SEQ")

  data <- data %>%
    populate_radio_button_fields(spec, target_vars, required_vars, numeric_bounds) %>%
    populate_date_fields(spec, target_vars, registration_start_date) %>%
    populate_dose_fields(target_vars) %>%
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

  # drug変数(field_type=="drug")には、who_drug_idfから薬剤名をサンプリングして格納する。
  # alias_nameでスコープを絞る(同じcdisc_variableが別alias_nameで固定値等の場合はそちらを変更しない)
  drug_vars <- compute_drug_vars(spec, target_vars)
  if (length(drug_vars) > 0 && !is.null(who_drug_idf)) {
    data <- data %>% populate_drug_fields(spec, drug_vars, who_drug_idf)
  }

  # presence_conditions/field_ref_bounds/age_boundsが他ドメインの変数を参照している場合、
  # built_domains(既に生成済みのドメイン)から値を結合してから条件を適用し、結合用に追加した列は最後に外す
  injected <- inject_cross_domain_refs(data, presence_conditions, field_ref_bounds, built_domains, cdisc_variable_to_prefix, age_bounds)
  data <- injected[["data"]] %>%
    apply_presence_conditions(presence_conditions) %>%
    apply_field_ref_bounds(spec, field_ref_bounds) %>%
    apply_age_date_bounds(age_bounds, registration_start_date) %>%
    select(-any_of(injected[["injected_cols"]]))

  # drug変数の値がwho_drug_idfの薬剤名(full_name_en)に完全一致する場合、prefixDECODに
  # generic_name_enを格納する(presence_conditions等で値が変わった後の最終状態を見る)。
  # 全て固定コード(default_value)で値が確定している場合は、一致確認する意味が無いのでDECOD列自体を作らない。
  # alias_nameはここまでで役目を終えるため、最後にまとめて落とす
  if (length(drug_vars) > 0 && !is.null(who_drug_idf) && drug_vars_need_decod(spec, drug_vars)) {
    data <- data %>% add_drug_decod(spec, drug_vars, who_drug_idf, prefix)
  }
  data <- data %>% add_visit_columns(visit_lookup) %>% select(-alias_name)

  data %>%
    reorder_domain_columns(front_cols = c(domain_front_cols(prefix), meddra_vars, coding_cols))
}

# TRのように、同じcdisc_variableが同じalias_name内で複数のlabel(繰り返しフィールド)に対応するドメイン向け。
# USUBJID×(alias_name, label)の組み合わせごとに1レコード作り、各変数は自分のlabelに対応するspec行だけを見て
# 値を生成する(対応するlabelが無ければNAのまま)。radio_button/date/meddra/dummyの基本パターンに対応
build_repeated_domain <- function(dm, spec, prefix, registration_start_date, meddra, presence_conditions, required_vars = character(0), add_coding_block = FALSE, built_domains = list(), cdisc_variable_to_prefix = NULL, age_bounds = NULL, multi_record_alias_names = character(0), who_drug_idf = NULL, active_sheet_table = NULL, visit_lookup = NULL) {
  drug_names <- if (!is.null(who_drug_idf)) who_drug_idf[["full_name_en"]] %>% discard(is.na) %>% unique() else character(0)
  # presence_conditions/age_boundsは全ドメイン分を含む共通テーブルのため、同じref_cdisc_variableを
  # 別ドメインが別のlabelで参照しているとinject_cross_domain_refs()が混同してしまう。
  # このドメイン自身のcdisc_variableに関する行だけに絞ってから使う
  presence_conditions <- presence_conditions %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  if (!is.null(age_bounds)) {
    age_bounds <- age_bounds %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  }

  repeat_units <- spec %>% distinct(alias_name, label) %>% filter(!is.na(label))

  # active_sheet_table(USUBJID, alias_name)が指定されている場合、被験者ごとに実際に有効な
  # (=そのシートが表示される)alias_nameのlabelだけを対象にする。指定が無い場合は全被験者×全labelを対象にする(従来通り)
  data <- if (!is.null(active_sheet_table)) {
    active_sheet_table %>%
      inner_join(repeat_units, by = "alias_name", relationship = "many-to-many") %>%
      left_join(dm %>% select(USUBJID, STUDYID), by = "USUBJID")
  } else {
    dm %>%
      select(USUBJID, STUDYID) %>%
      tidyr::crossing(repeat_units)
  }
  data[["DOMAIN"]] <- prefix

  spid_var <- str_c(prefix, "SPID")
  data[[spid_var]] <- data[["alias_name"]]
  data <- data %>% apply_multi_record_spid(spid_var, multi_record_alias_names)

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
        } else if (ft == "drug") {
          dv <- default_value[1]
          fixed_name <- if (!is.na(dv) && str_detect(dv, "^[0-9]+$")) {
            who_drug_idf %>% filter(drug_code == dv) %>% pull(full_name_en) %>% discard(is.na) %>% unique()
          } else {
            character(0)
          }
          if (length(fixed_name) >= 1) {
            rep(fixed_name[1], nn)
          } else if (length(drug_names) > 0) {
            sample(drug_names, nn, replace = TRUE)
          } else {
            rep(NA_character_, nn)
          }
        } else if (str_detect(var_name, "DOSE$")) {
          sample(dose_value_choices, nn, replace = TRUE)
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

  # presence_conditions/age_boundsが他ドメインの変数を参照している場合、built_domainsから値を結合してから適用し、
  # 結合用に追加した列は最後に外す(alias_name/labelが揃っている場合はそれも突き合わせキーに使う)
  injected <- inject_cross_domain_refs(data, presence_conditions, NULL, built_domains, cdisc_variable_to_prefix, age_bounds)
  data <- injected[["data"]] %>%
    apply_presence_conditions(presence_conditions) %>%
    apply_age_date_bounds(age_bounds, registration_start_date) %>%
    select(-any_of(injected[["injected_cols"]]))

  # drug変数の値がwho_drug_idfの薬剤名(full_name_en)に完全一致する場合、prefixDECODに
  # generic_name_enを格納する(presence_conditions等で値が変わった後の最終状態を見る)。
  # 全て固定コード(default_value)で値が確定している場合は、一致確認する意味が無いのでDECOD列自体を作らない
  drug_vars <- spec %>% filter(field_type == "drug") %>% distinct(cdisc_variable) %>% pull(cdisc_variable) %>% intersect(colnames(data))
  if (length(drug_vars) > 0 && !is.null(who_drug_idf) && drug_vars_need_decod(spec, drug_vars)) {
    data <- data %>% add_drug_decod(spec, drug_vars, who_drug_idf, prefix)
  }

  # alias_name/labelはここでは落とさない(他ドメインからの参照で突き合わせキーとして使うため)。
  # build_other_domains側で、返り値を作る最後の段階で取り除く
  data %>%
    add_visit_columns(visit_lookup) %>%
    add_seq(str_c(prefix, "SEQ")) %>%
    reorder_domain_columns(front_cols = c(domain_front_cols(prefix), coding_cols))
}

# dataの各行が持つalias_name(例: AEドメインの"ae"/"sae_report")について、exclude_prefix以外に
# 同じalias_nameでフィールドを定義しているprefix(例: FA)がある場合、そのフィールドを同じ行に
# 直接追加する(FieldItem的な意味で「同じフォーム上の別ブロック」を表す)。
# これにより、"ae"シートのようにAE報告と同一フォーム上にあるFA項目が同じ行(=同じ報告インスタンス)として
# 扱われ、ブロックをまたぐpresence_conditions(例: FAOBJがAELLTCDを参照)がドメインをまたぐ結合なしに
# 正しく判定できるようになる。戻り値のlinked_specは、実際に追加したprefix/alias_nameの一覧
# (呼び出し側で、二重生成を避けるための除外や、後でsplit_linked_domains()に分離する際に使う)
populate_linked_blocks <- function(data, cdisc_variable_values, exclude_prefix, registration_start_date, meddra, required_vars = character(0), who_drug_idf = NULL) {
  own_alias_names <- data[["alias_name"]] %>% unique()
  linked_spec <- cdisc_variable_values %>%
    filter(prefix != exclude_prefix, alias_name %in% own_alias_names)

  if (nrow(linked_spec) == 0) {
    return(list(data = data, linked_spec = linked_spec))
  }

  drug_names <- if (!is.null(who_drug_idf)) who_drug_idf[["full_name_en"]] %>% discard(is.na) %>% unique() else character(0)
  linked_vars <- linked_spec %>% distinct(cdisc_variable) %>% pull(cdisc_variable)

  for (var_name in linked_vars) {
    var_spec <- linked_spec %>% filter(cdisc_variable == var_name)

    lookup <- var_spec %>%
      group_by(alias_name) %>%
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

    data <- data %>%
      left_join(lookup, by = "alias_name") %>%
      group_by(alias_name) %>%
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
        } else if (ft == "drug") {
          dv <- default_value[1]
          fixed_name <- if (!is.na(dv) && str_detect(dv, "^[0-9]+$")) {
            who_drug_idf %>% filter(drug_code == dv) %>% pull(full_name_en) %>% discard(is.na) %>% unique()
          } else {
            character(0)
          }
          if (length(fixed_name) >= 1) {
            rep(fixed_name[1], nn)
          } else if (length(drug_names) > 0) {
            sample(drug_names, nn, replace = TRUE)
          } else {
            rep(NA_character_, nn)
          }
        } else if (str_detect(var_name, "DOSE$")) {
          sample(dose_value_choices, nn, replace = TRUE)
        } else {
          rep("DUMMY", nn)
        }
      }) %>%
      ungroup() %>%
      select(-field_type, -default_value, -codes, -is_invisible_any)
  }

  list(data = data, linked_spec = linked_spec)
}

# populate_linked_blocks()で同じ行に追加した列を、prefixごとの別テーブルに分離する。
# source_spid_col(例: AESPID)の値をそのままprefixSPID(例: FASPID)として引き継ぐことで、
# どのAE報告インスタンスに対応するリンク行かが分かるようにする
split_linked_domains <- function(data, linked_spec, source_spid_col) {
  if (nrow(linked_spec) == 0) {
    return(list())
  }
  linked_alias_by_prefix <- linked_spec %>% distinct(prefix, alias_name)
  prefixes <- unique(linked_spec[["prefix"]])

  prefixes %>%
    set_names() %>%
    map(function(px) {
      px_alias_names <- linked_alias_by_prefix %>% filter(prefix == px) %>% pull(alias_name)
      px_vars <- linked_spec %>% filter(prefix == px) %>% distinct(cdisc_variable) %>% pull(cdisc_variable)
      spid_var <- str_c(px, "SPID")
      data %>%
        filter(alias_name %in% px_alias_names) %>%
        mutate(DOMAIN = px, !!spid_var := .data[[source_spid_col]]) %>%
        select(STUDYID, DOMAIN, USUBJID, alias_name, all_of(spid_var), any_of(px_vars))
    })
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
                                 exclude_prefixes = c("DM", "AE", "DS"), coding_block_prefixes = c("MH"), repeated_prefixes = character(0), built_domains = list(), age_bounds = NULL, multi_record_alias_names = character(0), who_drug_idf = NULL, active_sheet_table = NULL, visit_lookup = NULL) {
  prefixes <- setdiff(unique(cdisc_variable_values[["prefix"]]), exclude_prefixes)

  cdisc_variable_to_prefix <- build_cdisc_variable_to_prefix(cdisc_variable_values)
  edges <- build_cross_prefix_edges(presence_conditions, field_ref_bounds, cdisc_variable_to_prefix, age_bounds)
  ordered_prefixes <- topo_sort_prefixes(prefixes, edges)

  for (px in ordered_prefixes) {
    spec <- cdisc_variable_values %>% filter(prefix == px)
    built_domains[[px]] <- if (px %in% repeated_prefixes || has_repeated_labels(spec)) {
      build_repeated_domain(
        dm, spec, px, registration_start_date, meddra, presence_conditions, required_vars,
        add_coding_block = px %in% coding_block_prefixes,
        built_domains = built_domains, cdisc_variable_to_prefix = cdisc_variable_to_prefix, age_bounds = age_bounds,
        multi_record_alias_names = multi_record_alias_names, who_drug_idf = who_drug_idf, active_sheet_table = active_sheet_table,
        visit_lookup = visit_lookup
      )
    } else {
      build_generic_domain(
        dm, spec, px, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds,
        add_coding_block = px %in% coding_block_prefixes,
        built_domains = built_domains, cdisc_variable_to_prefix = cdisc_variable_to_prefix, age_bounds = age_bounds,
        multi_record_alias_names = multi_record_alias_names, who_drug_idf = who_drug_idf, active_sheet_table = active_sheet_table,
        visit_lookup = visit_lookup
      )
    }
  }

  # built_domainsの中にはalias_name/label(他ドメイン参照の突き合わせキー)が残っている場合があるため、
  # 返り値を作る最後の段階でのみ取り除く
  built_domains[prefixes] %>% map(~ select(.x, -any_of(c("alias_name", "label"))))
}
