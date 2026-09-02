library(tidyverse)
library(here)

source(here("generate_random_date.R"))

# specに定義されているがdataにまだ存在しないcdisc_variableを対象変数として抽出
compute_target_vars <- function(data, spec) {
  setdiff(unique(spec[["cdisc_variable"]]), colnames(data))
}

# check_box: radio_buttonと異なり複数選択が可能なため、実際の選択肢("" を除く)から1個以上を
# ランダムに選び、カンマ区切りで1つの文字列に結合する(選ぶ個数自体もランダムにすることで、
# 単一選択と複数選択が混在するようにする)。""が選択肢に含まれる場合(必須でない項目)は、
# 未選択(空欄)になることもある
sample_check_box_values <- function(choices, n) {
  real_choices <- setdiff(choices, "")
  has_blank <- "" %in% choices
  if (length(real_choices) == 0) {
    return(rep(if (has_blank) "" else NA_character_, n))
  }
  map_chr(seq_len(n), function(i) {
    if (has_blank && sample(c(TRUE, FALSE), 1)) {
      return("")
    }
    k <- sample(length(real_choices), size = sample(seq_len(length(real_choices)), 1))
    str_c(real_choices[k], collapse = ",")
  })
}

# radio_button/check_box: 全codeパターン(codeが無ければdefault_value)からランダムに割り振り。
# required_vars(presence型のvalidatorを持つcdisc_variable)に含まれず、かつis_invisibleがFALSE(可視項目)の場合は
# 必須ではないため、空白("")も選択肢に加える。
# numeric_bounds(cdisc_variable, min_value, max_value)がある場合、数値として範囲外のcodeは選択肢から除く。
# dataにalias_name列がある場合(build_generic_domainなど)は、同じcdisc_variableでも
# 定義しているalias_nameが違えばcodeを混ぜず、そのalias_nameの行だけ自分のcodeから選ぶ
populate_radio_button_fields <- function(data, spec, target_vars, required_vars = character(0), numeric_bounds = NULL) {
  options_spec <- spec %>% filter(field_type %in% c("radio_button", "check_box"))
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
        an_rows <- var_rows %>% filter(alias_name == an)
        choices <- build_choices(an_rows, var_name)
        target <- data[["alias_name"]] == an
        if (length(choices) > 0 && any(target)) {
          data[[var_name]][target] <- if (any(an_rows[["field_type"]] == "check_box")) {
            sample_check_box_values(choices, sum(target))
          } else {
            sample(choices, size = sum(target), replace = TRUE)
          }
        }
      }
    } else {
      choices <- build_choices(var_rows, var_name)
      if (length(choices) > 0) {
        data[[var_name]] <- if (any(var_rows[["field_type"]] == "check_box")) {
          sample_check_box_values(choices, nrow(data))
        } else {
          sample(choices, size = nrow(data), replace = TRUE)
        }
      }
    }
  }
  data
}

# date: registration_start_date〜今日の間でランダムな日付を生成。
# dataにalias_name列がある場合(build_generic_domainなど)は、同じcdisc_variableでも
# 定義しているalias_nameが違えば日付を入れず、そのcdisc_variableを実際に定義しているalias_nameの
# 行だけに絞って生成する(例: CMドメインで"concomitant_drug"にしか無いCMSTDTCが、
# それを定義していない"baseline1"の行にまで入ってしまうのを防ぐ)
populate_date_fields <- function(data, spec, target_vars, registration_start_date, date_ref_bounds = NULL) {
  date_vars <- spec %>%
    filter(field_type == "date") %>%
    pull(cdisc_variable) %>%
    unique() %>%
    intersect(target_vars)
  has_alias_name <- "alias_name" %in% colnames(data)

  # date_vars同士がvalidate_date_after_or_equal_to/validate_date_before_or_equal_to(他フィールド参照)で
  # 数珠つなぎに依存し合う場合、参照先が先に生成されていないと値を引けない。date_ref_bounds
  # (このdate_vars同士の依存だけ)を使って依存が無いものから順に並べ替える
  # (トポロジカルソート。循環参照があれば残りは元の順のまま追加する)
  if (!is.null(date_ref_bounds) && length(date_vars) > 1) {
    date_deps <- date_ref_bounds %>% filter(cdisc_variable %in% date_vars, ref_cdisc_variable %in% date_vars)
    sorted_date_vars <- character(0)
    remaining <- date_vars
    while (length(remaining) > 0) {
      unresolved <- date_deps %>% filter(ref_cdisc_variable %in% remaining) %>% pull(cdisc_variable) %>% unique()
      ready <- setdiff(remaining, unresolved)
      if (length(ready) == 0) {
        sorted_date_vars <- c(sorted_date_vars, remaining)
        break
      }
      sorted_date_vars <- c(sorted_date_vars, ready)
      remaining <- setdiff(remaining, ready)
    }
    date_vars <- sorted_date_vars
  }

  # BRTHDTC(生年月日)列がある場合(DM等)、生成する日付がBRTHDTCより前にならないよう、
  # 下限を「登録開始日とBRTHDTCの遅い方」にする(小児等でBRTHDTCが登録開始日より後になる場合、
  # 「生まれる前に同意している」といった矛盾が生じるのを防ぐ)。generate_random_date()の
  # start_date引数は列名の文字列も受け付けるため、計算結果を一時列として持たせて渡す
  has_brthdtc <- "BRTHDTC" %in% colnames(data)
  if (has_brthdtc) {
    data[["__date_lower_bound"]] <- as.character(pmax(as.Date(registration_start_date), as.Date(data[["BRTHDTC"]])))
  }
  start_bound <- if (has_brthdtc) "__date_lower_bound" else registration_start_date

  for (var_name in date_vars) {
    # var_nameにvalidate_date_after_or_equal_to/validate_date_before_or_equal_to(他フィールド参照。
    # 例: "field5")があれば、一律のstart_bound/今日ではなく、その参照先フィールドの値(同じ行)と
    # 一律の下限/上限の厳しい方を使うための一時列を作る(参照先列がまだ無い場合は一律のままにする)
    var_start_bound <- start_bound
    var_end_bound <- Sys.Date()
    if (!is.null(date_ref_bounds)) {
      min_ref <- date_ref_bounds %>%
        filter(cdisc_variable == var_name, bound_type == "min_date", ref_cdisc_variable %in% colnames(data)) %>%
        pull(ref_cdisc_variable) %>%
        unique()
      if (length(min_ref) > 0) {
        default_lower <- if (is.character(start_bound) && length(start_bound) == 1 && start_bound %in% colnames(data)) {
          as.Date(data[[start_bound]])
        } else {
          as.Date(start_bound)
        }
        lower_col <- str_c("__date_lower_bound__", var_name)
        data[[lower_col]] <- as.character(pmax(default_lower, as.Date(data[[min_ref[1]]]), na.rm = TRUE))
        var_start_bound <- lower_col
      }
      max_ref <- date_ref_bounds %>%
        filter(cdisc_variable == var_name, bound_type == "max_date", ref_cdisc_variable %in% colnames(data)) %>%
        pull(ref_cdisc_variable) %>%
        unique()
      if (length(max_ref) > 0) {
        upper_col <- str_c("__date_upper_bound__", var_name)
        data[[upper_col]] <- as.character(pmin(Sys.Date(), as.Date(data[[max_ref[1]]]), na.rm = TRUE))
        var_end_bound <- upper_col
      }
    }

    if (has_alias_name) {
      date_alias_names <- spec %>%
        filter(field_type == "date", cdisc_variable == var_name) %>%
        pull(alias_name) %>%
        unique()
      target_rows <- data[["alias_name"]] %in% date_alias_names
      data[[var_name]] <- as.Date(NA)
      if (any(target_rows)) {
        generated <- generate_random_date(data[target_rows, , drop = FALSE], var_start_bound, var_end_bound, var_name)
        data[[var_name]][target_rows] <- generated[[var_name]]
      }
    } else {
      data <- generate_random_date(data, var_start_bound, var_end_bound, var_name)
    }
  }

  if (has_brthdtc) {
    data[["__date_lower_bound"]] <- NULL
  }
  data <- data %>% select(-starts_with("__date_lower_bound__"), -starts_with("__date_upper_bound__"))
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

# presence_conditions(cdisc_variable, label, ref_cdisc_variable, ref_alias_name, ref_label, expected_value,
# condition_type)に基づき、条件を満たさないレコードのcdisc_variableをNAにする。インデックス代入を使うことで、
# 日付型など列の型を問わず安全に適用できる。
# condition_type=="equals": ref_cdisc_variableの値がexpected_value(複数行ならOR)と一致しない場合NAにする
# condition_type=="not_blank": ref_cdisc_variableが空白/NAの場合NAにする(expected_valueは使わない)
# condition_type=="copy": cdisc_variableの値をref_cdisc_variableの値でそのまま上書きする
# (FieldItem::Referenceのような「他フィールドの値をそのまま使う」項目向け)
#
# 同じcdisc_variableでも、ref_alias_nameが異なる複数の条件行がある場合(例: MHTERMのうち
# thrombophiliaブロックだけがMHOCCUR=='Y'でゲーティングされ、registrationブロックには無関係)、
# dataがalias_name列を持ち、そのref_alias_nameがdata自身のalias_nameのいずれかと一致するなら、
# その行(そのブロック)だけにゲーティングを適用する。一致しない(または不明)場合は全行に適用する
# (真に外部の固定参照とみなす。inject_cross_domain_refs()のスコープ判定と対になる)。
# さらに、labelはこの条件が対象とするcdisc_variable自身のインスタンス(label)を表す。
# 同じcdisc_variable名が複数labelに繰り返し定義され、それぞれ別々の条件を持つ場合(例: CM/baselineの
# 5つのCMTRTが、各々異なる閾値でゲーティングされているケース)、labelでも絞り込むことで
# 他インスタンスの条件を巻き込まないようにする
apply_presence_conditions <- function(data, presence_conditions) {
  applicable <- presence_conditions %>%
    filter(cdisc_variable %in% colnames(data), ref_cdisc_variable %in% colnames(data))
  if (!("ref_alias_name" %in% names(applicable))) {
    applicable[["ref_alias_name"]] <- NA_character_
  }
  if (!("ref_label" %in% names(applicable))) {
    applicable[["ref_label"]] <- NA_character_
  }
  if (!("label" %in% names(applicable))) {
    applicable[["label"]] <- NA_character_
  }

  has_data_alias_name <- "alias_name" %in% colnames(data)
  has_data_alias <- all(c("alias_name", "label") %in% colnames(data))
  data_alias_names <- if (has_data_alias_name) unique(data[["alias_name"]]) else character(0)

  # ref_alias_nameがdata自身のalias_nameのいずれかと一致する行だけに絞る(一致しなければ真に外部の
  # 固定参照とみなして全行を対象にする)。さらに、dataがlabelも持っており、かつref_labelが
  # そのalias_name内でdata自身が実際に持っているlabelの1つでもある場合は、同じalias_name内の他labelを
  # 巻き込まないようlabelでも絞り込む(例: thrombophilia内のlabel="006"のゲーティング条件を、
  # 同じalias_nameの他label(000〜005)に誤って適用しないため)。
  # 一方、ref_labelがdata自身のlabel群に存在しない場合(例: PC(label=111〜114)がEC側のlabel="054"を
  # 参照するような、別prefixの別の繰り返し軸を参照するケース)は、label不一致で全行が対象外になってしまうのを
  # 避けるため、alias_nameのみで絞り込む(=そのalias_name内の全labelに同じ参照値を適用する)。
  # own_labelが指定されている場合は、それとは独立に、cdisc_variable自身のインスタンス(data自身のlabel)でも絞り込む
  target_rows_for <- function(ref_alias_name, ref_label = NA_character_, own_label = NA_character_) {
    rows <- if (has_data_alias_name && !is.na(ref_alias_name) && ref_alias_name %in% data_alias_names) {
      r <- data[["alias_name"]] == ref_alias_name
      if (has_data_alias && !is.na(ref_label) && ref_label %in% data[["label"]][r]) {
        r <- r & data[["label"]] == ref_label
      }
      r
    } else {
      rep(TRUE, nrow(data))
    }
    if (has_data_alias && !is.na(own_label)) {
      rows <- rows & data[["label"]] == own_label
    }
    rows
  }

  # copyは先に適用する。同じcdisc_variableにequals/not_blankのゲーティング条件も併せて
  # 存在する場合(例: FAOBJがAETERMをコピーしつつ、AELLTCDが特定コードのときだけ値を持つ)、
  # 先にコピーしてから後段のゲーティングでNA化できるようにするため
  copy_conditions <- applicable %>%
    filter(condition_type == "copy") %>%
    distinct(cdisc_variable, ref_cdisc_variable, label)
  for (i in seq_len(nrow(copy_conditions))) {
    var_name <- copy_conditions[["cdisc_variable"]][i]
    ref_var <- copy_conditions[["ref_cdisc_variable"]][i]
    own_label <- copy_conditions[["label"]][i]
    target_rows <- if (has_data_alias && !is.na(own_label)) data[["label"]] == own_label else rep(TRUE, nrow(data))
    # コピー元(ref_var)がDate型の場合、文字列型のvar_nameへインデックス代入すると内部の数値表現が
    # そのまま文字列化されてしまうため、as.character()で明示的に変換してから代入する
    data[[var_name]][target_rows] <- as.character(data[[ref_var]][target_rows])
  }

  equals_conditions <- applicable %>%
    filter(condition_type == "equals") %>%
    group_by(cdisc_variable, ref_cdisc_variable, ref_alias_name, ref_label, label) %>%
    summarise(expected_values = list(unique(expected_value)), .groups = "drop")
  for (i in seq_len(nrow(equals_conditions))) {
    var_name <- equals_conditions[["cdisc_variable"]][i]
    ref_var <- equals_conditions[["ref_cdisc_variable"]][i]
    expected_values <- equals_conditions[["expected_values"]][[i]]
    target_rows <- target_rows_for(equals_conditions[["ref_alias_name"]][i], equals_conditions[["ref_label"]][i], equals_conditions[["label"]][i])
    mismatch <- target_rows & !(data[[ref_var]] %in% expected_values)
    data[[var_name]][mismatch] <- NA
  }

  not_blank_conditions <- applicable %>%
    filter(condition_type == "not_blank") %>%
    distinct(cdisc_variable, ref_cdisc_variable, ref_alias_name, ref_label, label)
  for (i in seq_len(nrow(not_blank_conditions))) {
    var_name <- not_blank_conditions[["cdisc_variable"]][i]
    ref_var <- not_blank_conditions[["ref_cdisc_variable"]][i]
    target_rows <- target_rows_for(not_blank_conditions[["ref_alias_name"]][i], not_blank_conditions[["ref_label"]][i], not_blank_conditions[["label"]][i])
    mismatch <- target_rows & (is.na(data[[ref_var]]) | data[[ref_var]] == "")
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
      new_dates <- as.Date(floor(runif(sum(target), as.numeric(lower[target]), as.numeric(upper[target]))), origin = "1970-01-01")
      # data[[var_name]]は文字列型のため、Date型のままインデックス代入すると
      # (YYYY-MM-DD形式ではなく)内部の数値表現が文字列化されてしまう。as.character()で明示的に変換する
      data[[var_name]][target] <- as.character(new_dates)
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
  # labelは、この参照条件が定義されている側(dataになる予定のドメイン自身)のインスタンス(label)。
  # 同じref_cdisc_variable(例: RSORRES)でも、参照元のlabelブロックごとに参照先のref_labelが
  # 異なる場合(例: MHの5つのSPDEVIDブロックが、それぞれ別のRSブロック(034/035/036/...)を参照する)、
  # このlabelを保持しておかないと、後段でどのpinをdataのどの行に適用すべきか判定できない
  # (field_ref_bounds/age_boundsはlabelを持たないため、その場合はNAのままになる)
  ref_instances <- bind_rows(
    presence_conditions %>% select(any_of(c("label", "ref_cdisc_variable", "ref_alias_name", "ref_label"))),
    field_ref_bounds %>% select(any_of("ref_cdisc_variable")),
    age_bounds %>% select(any_of(c("label", "ref_cdisc_variable", "ref_alias_name", "ref_label")))
  ) %>%
    filter(!is.na(ref_cdisc_variable)) %>%
    distinct()
  if (!("label" %in% names(ref_instances))) {
    ref_instances[["label"]] <- NA_character_
  }
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

    pins <- ref_instances %>% filter(ref_cdisc_variable == ref_var) %>% distinct(label, ref_alias_name, ref_label)
    for (i in seq_len(nrow(pins))) {
      pin_alias <- pins[["ref_alias_name"]][i]
      pin_label <- pins[["ref_label"]][i]
      own_label <- pins[["label"]][i]

      # このpinを適用する対象行: dataがalias_nameを持ち、そのpinのref_alias_nameが
      # data自身のalias_nameのいずれかと一致するならその行だけに絞る。一致しない(またはalias_name不明)なら
      # 真に外部の固定参照とみなして全行を対象にする。
      # さらにlabelでも絞り込む場合、優先するのはown_label(この条件が定義されているdata自身の
      # インスタンス)。ref_cdisc_variable(例: RSORRES)がブロックごとに異なるref_labelを持つとき
      # (例: MHの5つのSPDEVIDブロックが、それぞれ別のRSブロックを参照する)、own_labelが無いと
      # 「pin_labelがたまたまdata自身のlabelの1つと一致するか」でしか判定できず、参照先と参照元の
      # labelの語彙が違う(例: MHのlabelは047〜051、RSのlabelは034/035/036/...)場合に絞り込みが
      # 常に失敗し、最後に処理したpinの値が全ブロックに上書きされてしまう(既知のバグ)。
      # own_labelがあればそれを使い、無い場合(field_ref_bounds/age_bounds由来)は従来通り
      # pin_labelがdata自身のlabel群に含まれるかで判定する(例: thrombophilia内のlabel="006"への
      # pinを、同じalias_nameの他label(000〜005)に誤って適用しないため)。
      # pin_label・own_labelいずれもdata自身のlabelと無関係な場合(例: PC(label=111〜114)がEC側の
      # label="054"を参照するような、別prefixの別の繰り返し軸を参照するケース)は、label不一致で
      # 全行が対象外になってしまうのを避けるため、alias_nameのみで絞り込む
      target_rows <- if (has_data_alias_name && !is.na(pin_alias) && pin_alias %in% data_alias_names) {
        rows <- data[["alias_name"]] == pin_alias
        if (has_data_alias && !is.na(own_label) && own_label %in% data[["label"]][rows]) {
          rows <- rows & data[["label"]] == own_label
        } else if (has_data_alias && !is.na(pin_label) && pin_label %in% data[["label"]][rows]) {
          rows <- rows & data[["label"]] == pin_label
        }
        rows
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
  # 同じfull_name_enが複数行あり、一部だけgeneric_name_enが空のことがあるため、
  # distinct()で先頭行を無条件に採用すると本来値があるはずのケースまで空になってしまう。
  # generic_name_enが空でない行を優先して残すよう、先に並べ替えてからdistinct()する
  lookup <- who_drug_idf %>%
    filter(!is.na(full_name_en)) %>%
    arrange(is.na(generic_name_en)) %>%
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

# 同じcdisc_variable(date型)が複数のalias_name(シート)にまたがって定義されているドメイン
# (例: AEが"sae_report"/"ae2"の2シートに分かれる、EC/LB/VSが来院ごとに多数のシートに分かれる)では、
# 各シートの日付が互いに独立に生成されるため、シートの本来の並び順(sheet_orders$seq、
# EDC仕様上のフォーム表示順)と生成された日付の前後関係が矛盾することがある
# (例: 来院1のLBDTCが来院3のLBDTCより後になる)。
# 被験者ごとに、シート(alias_name)ブロック単位でまとめて日付をシフトすることでこれを解消する:
# 各(USUBJID, alias_name)ブロックの代表日付(そのブロック内で最も早い非NA日付)を求め、
# sheet_seq昇順に並べたブロックに、代表日付を昇順に並べ替えたものを割り当て直す。
# ブロック内の全date型列を同じ日数分シフトすることで、ブロック内の関係(同じ行の開始日<=終了日、
# 同じalias内のlabelを跨ぐ連鎖等)は変えずに保つ。シフト後の値は被験者の中止日(discontinuation_date、
# 無ければ今日)を上限にする(この関数はclamp_dates_to_discontinuationより後に呼ぶこと。
# シフトが中止日を超えないようこの関数自身で保証するため、これより後に他の日付再生成処理を
# 挟むと、その処理がシフト結果を独立に書き換えてalias間の順序を崩してしまう可能性がある)。
# alias_name列を持たない、またはdate_varsが複数aliasにまたがらないドメインでは何もしない
reorder_dates_by_sheet_seq <- function(data, date_vars, cdisc_variable_values, registration_start_date, discontinuation_date = NULL) {
  if (!("alias_name" %in% colnames(data)) || !("USUBJID" %in% colnames(data))) {
    return(data)
  }
  date_vars <- intersect(date_vars, colnames(data))
  if (length(date_vars) == 0) {
    return(data)
  }

  alias_seq_map <- cdisc_variable_values %>%
    filter(!is.na(sheet_seq)) %>%
    distinct(alias_name, sheet_seq)
  if (nrow(alias_seq_map) == 0) {
    return(data)
  }

  reg_start <- as.Date(registration_start_date)
  today <- Sys.Date()
  discon_lookup <- NULL
  if (!is.null(discontinuation_date) && nrow(discontinuation_date) > 0) {
    discon_map <- discontinuation_date %>% filter(!is.na(DISCONDTC)) %>% distinct(USUBJID, .keep_all = TRUE)
    discon_lookup <- set_names(as.Date(discon_map[["DISCONDTC"]]), discon_map[["USUBJID"]])
  }

  date_long <- data %>%
    mutate(.row_id = row_number()) %>%
    select(.row_id, USUBJID, alias_name, all_of(date_vars)) %>%
    pivot_longer(cols = all_of(date_vars), names_to = "var", values_to = "val") %>%
    filter(!is.na(val))
  if (nrow(date_long) == 0) {
    return(data)
  }

  anchors <- date_long %>%
    group_by(USUBJID, alias_name) %>%
    summarise(anchor = min(as.Date(val)), .groups = "drop") %>%
    inner_join(alias_seq_map, by = "alias_name")

  multi_usubjid <- anchors %>% count(USUBJID) %>% filter(n > 1) %>% pull(USUBJID)
  anchors <- anchors %>% filter(USUBJID %in% multi_usubjid)
  if (nrow(anchors) == 0) {
    return(data)
  }

  delta_table <- anchors %>%
    group_by(USUBJID) %>%
    arrange(sheet_seq, .by_group = TRUE) %>%
    mutate(new_anchor = sort(anchor)) %>%
    ungroup() %>%
    mutate(delta = as.numeric(new_anchor - anchor)) %>%
    filter(delta != 0) %>%
    select(USUBJID, alias_name, delta)
  if (nrow(delta_table) == 0) {
    return(data)
  }

  data <- data %>%
    left_join(delta_table, by = c("USUBJID", "alias_name"))

  row_upper_bound <- rep(today, nrow(data))
  if (!is.null(discon_lookup)) {
    row_discon <- discon_lookup[data[["USUBJID"]]]
    row_upper_bound <- pmin(row_upper_bound, row_discon, na.rm = TRUE)
  }

  for (var_name in date_vars) {
    has_val <- !is.na(data[[var_name]]) & !is.na(data[["delta"]])
    if (!any(has_val)) next
    new_dates <- as.Date(data[[var_name]][has_val]) + data[["delta"]][has_val]
    new_dates <- pmin(pmax(new_dates, reg_start), row_upper_bound[has_val])
    data[[var_name]][has_val] <- as.character(new_dates)
  }

  data %>% select(-delta)
}

# other_domainsのdate型項目は登録開始日〜今日の範囲でランダムに生成されるが、被験者の中止日
# (DISCONDTC)は考慮しないため、中止後に検査等が発生しているように見えてしまうことがある
# (validate_other_domains.Rのno_records_after_discontinuationチェックで検出される)。
# 中止日情報がある被験者については、登録開始日〜中止日の範囲に収まるよう日付を再生成することで
# この矛盾を解消する。中止日情報が無い(NAまたはdiscontinuation_dateに無い)被験者は対象外
# (今まで通り登録開始日〜今日の範囲のまま)。registration_start_date > 中止日の場合(通常は
# 起こらないはずだが念のため)は中止日そのものにする
clamp_dates_to_discontinuation <- function(data, date_vars, registration_start_date, discontinuation_date, date_ref_bounds = NULL) {
  if (is.null(discontinuation_date) || nrow(discontinuation_date) == 0 || !("USUBJID" %in% colnames(data))) {
    return(data)
  }
  date_vars <- intersect(date_vars, colnames(data))
  if (length(date_vars) == 0) {
    return(data)
  }

  discon_map <- discontinuation_date %>% filter(!is.na(DISCONDTC)) %>% distinct(USUBJID, .keep_all = TRUE)
  discon_lookup <- set_names(as.Date(discon_map[["DISCONDTC"]]), discon_map[["USUBJID"]])
  reg_start <- as.Date(registration_start_date)

  # date_vars同士がvalidate_date_after_or_equal_to/validate_date_before_or_equal_to(他フィールド参照)で
  # 依存し合う場合(例: ECENDTCがECSTDTC以降)、ここで独立に再サンプルすると関係が崩れてしまう。
  # populate_date_fields/build_repeated_domain等と同じ理由で、参照先が先に処理されるよう並べ替える
  ordered_date_vars <- date_vars
  if (!is.null(date_ref_bounds) && length(date_vars) > 1) {
    date_deps <- date_ref_bounds %>% filter(cdisc_variable %in% date_vars, ref_cdisc_variable %in% date_vars)
    sorted_date_vars <- character(0)
    remaining <- date_vars
    while (length(remaining) > 0) {
      unresolved <- date_deps %>% filter(ref_cdisc_variable %in% remaining) %>% pull(cdisc_variable) %>% unique()
      ready <- setdiff(remaining, unresolved)
      if (length(ready) == 0) {
        sorted_date_vars <- c(sorted_date_vars, remaining)
        break
      }
      sorted_date_vars <- c(sorted_date_vars, ready)
      remaining <- setdiff(remaining, ready)
    }
    ordered_date_vars <- sorted_date_vars
  }

  for (var_name in ordered_date_vars) {
    current <- as.Date(as.character(data[[var_name]]))
    discon <- discon_lookup[data[["USUBJID"]]]

    min_ref_vals <- NULL
    max_ref_vals <- NULL
    if (!is.null(date_ref_bounds)) {
      min_ref <- date_ref_bounds %>%
        filter(cdisc_variable == var_name, bound_type == "min_date", ref_cdisc_variable %in% colnames(data)) %>%
        pull(ref_cdisc_variable) %>%
        unique()
      if (length(min_ref) > 0) {
        min_ref_vals <- as.Date(as.character(data[[min_ref[1]]]))
      }
      max_ref <- date_ref_bounds %>%
        filter(cdisc_variable == var_name, bound_type == "max_date", ref_cdisc_variable %in% colnames(data)) %>%
        pull(ref_cdisc_variable) %>%
        unique()
      if (length(max_ref) > 0) {
        max_ref_vals <- as.Date(as.character(data[[max_ref[1]]]))
      }
    }

    # discon超過に加えて、同一行内の他日付フィールド(先に処理済み)との参照関係(ECSTDTC<=ECENDTC等)が
    # 崩れている行も再サンプル対象にする。参照先の値が先の反復で更新されている可能性があるため。
    discon_over <- !is.na(current) & !is.na(discon) & current > discon
    ref_violation <- rep(FALSE, length(current))
    if (!is.null(min_ref_vals)) {
      ref_violation <- ref_violation | (!is.na(current) & !is.na(min_ref_vals) & current < min_ref_vals)
    }
    if (!is.null(max_ref_vals)) {
      ref_violation <- ref_violation | (!is.na(current) & !is.na(max_ref_vals) & current > max_ref_vals)
    }
    over <- discon_over | ref_violation
    if (!any(over)) next

    lower <- rep(reg_start, sum(over))
    # discon(中止日)が無い被験者は中止日による上限は課さず、参照先の日付関係のみを尊重する
    discon_over_vals <- discon[over]
    upper <- as.Date(ifelse(is.na(discon_over_vals), as.character(current[over]), as.character(pmax(discon_over_vals, reg_start))))
    if (!is.null(min_ref_vals)) {
      lower <- pmax(lower, min_ref_vals[over], na.rm = TRUE)
    }
    if (!is.null(max_ref_vals)) {
      upper <- pmin(upper, max_ref_vals[over], na.rm = TRUE)
    }
    upper <- pmax(upper, lower)
    new_dates <- lower + floor(runif(sum(over), 0, as.numeric(upper - lower) + 1))
    data[[var_name]][over] <- as.character(new_dates)
  }
  data
}

# 1つのalias_name内で、同じcdisc_variable名(例: ECSTDTC/ECENDTC)がlabel(繰り返しの1回分、例: 投与1回目・2回目...)
# ごとに複数回登場し、「同じlabel内での開始日<=終了日」と「次のlabelの開始日>=前のlabelの終了日」のような
# label内参照とlabelを跨ぐ参照が交互に連なるケース(例: test4のEC複数回投与)向けの日付生成。
# date_ref_boundsのうちこのalias_nameかつchain_varsに関する行(label内・label跨ぎの両方)から
# (label, cdisc_variable)をノードとする依存グラフを作り、トポロジカル順に1ノードずつ値を確定させていく。
# build_repeated_domain()の通常の列単位生成(同じ行=同じlabelの参照しか扱えない)を、
# このalias_nameのchain_varsに関してだけ上書きする形で使う
regenerate_date_chain <- function(data, alias_name_val, date_ref_bounds, chain_vars, registration_start_date, discon_lookup = NULL) {
  reg_start <- as.Date(registration_start_date)
  bounds <- date_ref_bounds %>%
    filter(alias_name == alias_name_val, cdisc_variable %in% chain_vars, !is.na(label), !is.na(ref_label))
  if (nrow(bounds) == 0) {
    return(data)
  }

  nodes <- bind_rows(
    bounds %>% distinct(label, cdisc_variable),
    bounds %>% distinct(label = ref_label, cdisc_variable = ref_cdisc_variable)
  ) %>% distinct()

  node_key <- function(label_vec, var_vec) str_c(label_vec, "::", var_vec)
  all_keys <- node_key(nodes$label, nodes$cdisc_variable)
  edge_from <- node_key(bounds$label, bounds$cdisc_variable)
  edge_to <- node_key(bounds$ref_label, bounds$ref_cdisc_variable)

  remaining <- all_keys
  ordered_keys <- character(0)
  while (length(remaining) > 0) {
    unresolved <- edge_from[edge_to %in% remaining]
    ready <- setdiff(remaining, unresolved)
    if (length(ready) == 0) {
      ordered_keys <- c(ordered_keys, remaining)
      break
    }
    ordered_keys <- c(ordered_keys, ready)
    remaining <- setdiff(remaining, ready)
  }
  ordered_nodes <- nodes[match(ordered_keys, all_keys), ]

  for (i in seq_len(nrow(ordered_nodes))) {
    label_val <- ordered_nodes$label[i]
    var_name <- ordered_nodes$cdisc_variable[i]
    if (!(var_name %in% colnames(data))) next
    mask <- data[["alias_name"]] == alias_name_val & data[["label"]] == label_val
    if (!any(mask)) next

    row_bounds <- bounds %>% filter(label == label_val, cdisc_variable == var_name)
    min_row <- row_bounds %>% filter(bound_type == "min_date") %>% slice(1)
    max_row <- row_bounds %>% filter(bound_type == "max_date") %>% slice(1)

    ref_value_for <- function(ref_label_val, ref_var) {
      if (is.na(ref_label_val) || is.na(ref_var) || !(ref_var %in% colnames(data))) {
        return(rep(NA_real_, sum(mask)))
      }
      ref_rows <- data %>%
        filter(.data[["alias_name"]] == alias_name_val, .data[["label"]] == ref_label_val) %>%
        transmute(USUBJID, ref_val = as.Date(as.character(.data[[ref_var]])))
      joined <- data[mask, "USUBJID", drop = FALSE] %>% left_join(ref_rows, by = "USUBJID")
      as.numeric(joined[["ref_val"]])
    }

    lower <- rep(as.numeric(reg_start), sum(mask))
    if (nrow(min_row) > 0) {
      lower <- pmax(lower, ref_value_for(min_row[["ref_label"]], min_row[["ref_cdisc_variable"]]), na.rm = TRUE)
    }
    upper <- rep(as.numeric(Sys.Date()), sum(mask))
    if (!is.null(discon_lookup)) {
      discon_vals <- as.numeric(discon_lookup[data[["USUBJID"]][mask]])
      upper <- ifelse(is.na(discon_vals), upper, pmin(upper, discon_vals))
    }
    if (nrow(max_row) > 0) {
      upper <- pmin(upper, ref_value_for(max_row[["ref_label"]], max_row[["ref_cdisc_variable"]]), na.rm = TRUE)
    }
    upper <- pmax(upper, lower)
    new_dates <- as.Date(floor(runif(sum(mask), lower, upper + 1)), origin = "1970-01-01")
    data[[var_name]][mask] <- as.character(new_dates)
  }
  data
}

# DM/AE/DSのような個別ロジックを持たないドメイン向けの汎用生成。
# alias_nameがmulti_record_alias_namesに該当しない場合はUSUBJIDごとに1レコード、
# 該当する場合(AE報告のように被験者ごとに複数件記録されうるシート)はAEドメインと同様、
# 被験者に対してランダムな件数(0件を含む)のレコードを作る。
# radio_button/date/ダミーの共通パターンで項目を埋め、prefixSEQ(例: CMSEQ)をデータセット全体の通番として、
# prefixSPID(例: CMSPID)にalias_name(該当する場合はUSUBJID×alias_name内の連番付き)を付与する
build_generic_domain <- function(dm, spec, prefix, registration_start_date, meddra, presence_conditions, required_vars = character(0), numeric_bounds = NULL, field_ref_bounds = NULL, add_coding_block = FALSE, built_domains = list(), cdisc_variable_to_prefix = NULL, age_bounds = NULL, multi_record_alias_names = character(0), who_drug_idf = NULL, active_sheet_table = NULL, visit_lookup = NULL, discontinuation_date = NULL, date_ref_bounds = NULL) {
  # presence_conditions/field_ref_bounds/age_bounds/date_ref_boundsは全ドメイン分を含む共通テーブルのため、
  # 同じref_cdisc_variableを別ドメインが別のlabelで参照しているとinject_cross_domain_refs()が混同してしまう。
  # このドメイン自身のcdisc_variableに関する行だけに絞ってから使う
  presence_conditions <- presence_conditions %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  if (!is.null(field_ref_bounds)) {
    field_ref_bounds <- field_ref_bounds %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  }
  if (!is.null(age_bounds)) {
    age_bounds <- age_bounds %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  }
  if (!is.null(date_ref_bounds)) {
    date_ref_bounds <- date_ref_bounds %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
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

  date_vars <- spec %>% filter(field_type == "date") %>% pull(cdisc_variable) %>% unique() %>% intersect(target_vars)

  data <- data %>%
    populate_radio_button_fields(spec, target_vars, required_vars, numeric_bounds) %>%
    populate_date_fields(spec, target_vars, registration_start_date, date_ref_bounds) %>%
    clamp_dates_to_discontinuation(date_vars, registration_start_date, discontinuation_date, date_ref_bounds) %>%
    # 同じcdisc_variableが複数alias(シート)にまたがる場合、シートの本来の並び順(sheet_seq)に沿うよう
    # alias単位でまとめて日付をシフトする。clampより後に行うことで、シフト結果を最終的な値として保つ
    # (この関数自体が被験者の中止日を上限にするため、clampが先に行った中止日調整と矛盾しない)
    reorder_dates_by_sheet_seq(date_vars, spec, registration_start_date, discontinuation_date) %>%
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
build_repeated_domain <- function(dm, spec, prefix, registration_start_date, meddra, presence_conditions, required_vars = character(0), add_coding_block = FALSE, built_domains = list(), cdisc_variable_to_prefix = NULL, age_bounds = NULL, multi_record_alias_names = character(0), who_drug_idf = NULL, active_sheet_table = NULL, visit_lookup = NULL, discontinuation_date = NULL, date_ref_bounds = NULL) {
  drug_names <- if (!is.null(who_drug_idf)) who_drug_idf[["full_name_en"]] %>% discard(is.na) %>% unique() else character(0)
  # presence_conditions/age_bounds/date_ref_boundsは全ドメイン分を含む共通テーブルのため、
  # 同じref_cdisc_variableを別ドメインが別のlabelで参照しているとinject_cross_domain_refs()が
  # 混同してしまう。このドメイン自身のcdisc_variableに関する行だけに絞ってから使う
  presence_conditions <- presence_conditions %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  if (!is.null(age_bounds)) {
    age_bounds <- age_bounds %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
  }
  if (!is.null(date_ref_bounds)) {
    date_ref_bounds <- date_ref_bounds %>% filter(cdisc_variable %in% spec[["cdisc_variable"]])
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

  # date型の変数同士が、同じ行(同一alias_name×label)の中でvalidate_date_after_or_equal_to/
  # validate_date_before_or_equal_to(他フィールド参照)によって数珠つなぎに依存し合う場合
  # (例: field101がfield90を下限にし、field90がfield89を下限にする)、参照先が先に生成されて
  # いないと値を引けない。date_ref_bounds(このドメインのdate_vars同士の依存だけ)を使って
  # 依存が無いものから順に並べ替える(トポロジカルソート。循環参照があれば残りは元の順のまま追加する)
  date_vars <- spec %>% filter(field_type == "date") %>% pull(cdisc_variable) %>% unique() %>% intersect(target_vars)
  if (!is.null(date_ref_bounds) && length(date_vars) > 1) {
    date_deps <- date_ref_bounds %>% filter(cdisc_variable %in% date_vars, ref_cdisc_variable %in% date_vars)
    sorted_date_vars <- character(0)
    remaining <- date_vars
    while (length(remaining) > 0) {
      unresolved <- date_deps %>% filter(ref_cdisc_variable %in% remaining) %>% pull(cdisc_variable) %>% unique()
      ready <- setdiff(remaining, unresolved)
      if (length(ready) == 0) {
        sorted_date_vars <- c(sorted_date_vars, remaining)
        break
      }
      sorted_date_vars <- c(sorted_date_vars, ready)
      remaining <- setdiff(remaining, ready)
    }
    target_vars <- c(setdiff(target_vars, date_vars), sorted_date_vars)
  }

  # (alias_name, label)ごとにdplyr::filter()/which()で行を探すと「組み合わせ数×行数」のスキャンになり、
  # labelの種類が多いドメインで遅くなる。group_by()のハッシュ化されたグループ処理に任せることで、
  # スキャンを行わずに値を割り振る
  for (var_name in target_vars) {
    var_spec <- spec %>% filter(cdisc_variable == var_name)

    # var_nameにvalidate_date_after_or_equal_to/validate_date_before_or_equal_to(他フィールド参照)が
    # あり、かつ参照先が既に生成済み(このforループの前の反復で追加された列)なら、そのfield名(列名)を
    # 使う。無ければNAのままにし、mutate内では従来通りの一律の範囲で生成する
    date_min_ref <- if (!is.null(date_ref_bounds)) {
      date_ref_bounds %>%
        filter(cdisc_variable == var_name, bound_type == "min_date", ref_cdisc_variable %in% colnames(data)) %>%
        pull(ref_cdisc_variable) %>%
        unique()
    } else {
      character(0)
    }
    date_min_ref <- if (length(date_min_ref) > 0) date_min_ref[1] else NA_character_
    date_max_ref <- if (!is.null(date_ref_bounds)) {
      date_ref_bounds %>%
        filter(cdisc_variable == var_name, bound_type == "max_date", ref_cdisc_variable %in% colnames(data)) %>%
        pull(ref_cdisc_variable) %>%
        unique()
    } else {
      character(0)
    }
    date_max_ref <- if (length(date_max_ref) > 0) date_max_ref[1] else NA_character_

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
        } else if (ft %in% c("radio_button", "check_box")) {
          cs <- codes[[1]]
          if (length(cs) == 0) {
            rep(NA_character_, nn)
          } else if (ft == "check_box") {
            sample_check_box_values(cs, nn)
          } else {
            sample(cs, nn, replace = TRUE)
          }
        } else if (ft == "date") {
          if (is.na(date_min_ref) && is.na(date_max_ref)) {
            as.character(sample(seq(as.Date(registration_start_date), Sys.Date(), by = "day"), nn, replace = TRUE))
          } else {
            lower <- rep(as.Date(registration_start_date), nn)
            if (!is.na(date_min_ref)) lower <- pmax(lower, as.Date(.data[[date_min_ref]]), na.rm = TRUE)
            upper <- rep(Sys.Date(), nn)
            if (!is.na(date_max_ref)) upper <- pmin(upper, as.Date(.data[[date_max_ref]]), na.rm = TRUE)
            upper <- pmax(upper, lower)
            as.character(as.Date(floor(runif(nn, as.numeric(lower), as.numeric(upper) + 1)), origin = "1970-01-01"))
          }
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

  date_vars <- spec %>% filter(field_type == "date") %>% pull(cdisc_variable) %>% unique() %>% intersect(target_vars)

  # 1つのalias内でcdisc_variable名がlabel(繰り返しの1回分)を跨いで連鎖する行(例: 次回投与の開始日が
  # 前回投与の終了日を参照する)がある場合、通常の列単位生成ではlabelを跨いだ参照を扱えないため、
  # regenerate_date_chain()でそのalias・その変数だけ生成し直す。それ以外の変数はclamp_dates_to_discontinuationに任せる
  chain_bounds <- if (!is.null(date_ref_bounds)) {
    date_ref_bounds %>% filter(cdisc_variable %in% date_vars, !is.na(label), !is.na(ref_label), label != ref_label)
  } else {
    date_ref_bounds
  }
  if (!is.null(chain_bounds) && nrow(chain_bounds) > 0) {
    chain_vars <- union(chain_bounds[["cdisc_variable"]], chain_bounds[["ref_cdisc_variable"]]) %>% intersect(date_vars)
    discon_lookup <- NULL
    if (!is.null(discontinuation_date) && nrow(discontinuation_date) > 0 && "USUBJID" %in% colnames(data)) {
      discon_map <- discontinuation_date %>% filter(!is.na(DISCONDTC)) %>% distinct(USUBJID, .keep_all = TRUE)
      discon_lookup <- set_names(as.Date(discon_map[["DISCONDTC"]]), discon_map[["USUBJID"]])
    }
    for (alias_val in unique(chain_bounds[["alias_name"]])) {
      data <- regenerate_date_chain(data, alias_val, date_ref_bounds, chain_vars, registration_start_date, discon_lookup)
    }
  }
  # chain_varsはcdisc_variable単位の判定のため、同じ変数名でもlabelを跨ぐ連鎖を持たない他のlabel
  # (例: RSDTCのうち "baseline" alias以外の通常のvisit)まで丸ごとclampから除外してしまうと、
  # そちらの中止日超過チェックが素通りしてしまう。clampにはlabelを跨ぐ行(label!=ref_label)だけを
  # 除いたdate_ref_boundsを渡し、変数自体は除外せず全date_varsを対象にする
  date_ref_bounds_for_clamp <- if (!is.null(date_ref_bounds)) {
    date_ref_bounds %>% filter(is.na(label) | is.na(ref_label) | label == ref_label)
  } else {
    date_ref_bounds
  }
  data <- clamp_dates_to_discontinuation(data, date_vars, registration_start_date, discontinuation_date, date_ref_bounds_for_clamp)
  # 同じcdisc_variableが複数alias(シート)にまたがる場合(例: 来院ごとに繰り返すEC/LB/VS)、
  # シートの本来の並び順(sheet_seq)に沿うようalias単位でまとめて日付をシフトする。
  # alias内の関係(同じ行の開始日<=終了日、labelを跨ぐ連鎖)は保ったまま動くため、上の
  # regenerate_date_chain()・clampより後に行う(この関数自体が中止日を上限にするため矛盾しない)
  data <- reorder_dates_by_sheet_seq(data, date_vars, spec, registration_start_date, discontinuation_date)

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
populate_linked_blocks <- function(data, cdisc_variable_values, exclude_prefix, registration_start_date, meddra, required_vars = character(0), who_drug_idf = NULL, date_ref_bounds = NULL) {
  own_alias_names <- data[["alias_name"]] %>% unique()
  linked_spec <- cdisc_variable_values %>%
    filter(prefix != exclude_prefix, alias_name %in% own_alias_names)

  if (nrow(linked_spec) == 0) {
    return(list(data = data, linked_spec = linked_spec))
  }

  drug_names <- if (!is.null(who_drug_idf)) who_drug_idf[["full_name_en"]] %>% discard(is.na) %>% unique() else character(0)
  linked_vars <- linked_spec %>% distinct(cdisc_variable) %>% pull(cdisc_variable)

  if (!is.null(date_ref_bounds)) {
    date_ref_bounds <- date_ref_bounds %>% filter(cdisc_variable %in% linked_spec[["cdisc_variable"]])
  }
  # date型の変数同士が他フィールド参照で数珠つなぎに依存し合う場合(build_repeated_domain()と同じ理由)、
  # 参照先が先に生成されるよう並べ替える
  linked_date_vars <- linked_spec %>% filter(field_type == "date") %>% pull(cdisc_variable) %>% unique() %>% intersect(linked_vars)
  if (!is.null(date_ref_bounds) && length(linked_date_vars) > 1) {
    date_deps <- date_ref_bounds %>% filter(cdisc_variable %in% linked_date_vars, ref_cdisc_variable %in% linked_date_vars)
    sorted_date_vars <- character(0)
    remaining <- linked_date_vars
    while (length(remaining) > 0) {
      unresolved <- date_deps %>% filter(ref_cdisc_variable %in% remaining) %>% pull(cdisc_variable) %>% unique()
      ready <- setdiff(remaining, unresolved)
      if (length(ready) == 0) {
        sorted_date_vars <- c(sorted_date_vars, remaining)
        break
      }
      sorted_date_vars <- c(sorted_date_vars, ready)
      remaining <- setdiff(remaining, ready)
    }
    linked_vars <- c(setdiff(linked_vars, linked_date_vars), sorted_date_vars)
  }

  for (var_name in linked_vars) {
    var_spec <- linked_spec %>% filter(cdisc_variable == var_name)

    date_min_ref <- if (!is.null(date_ref_bounds)) {
      date_ref_bounds %>%
        filter(cdisc_variable == var_name, bound_type == "min_date", ref_cdisc_variable %in% colnames(data)) %>%
        pull(ref_cdisc_variable) %>%
        unique()
    } else {
      character(0)
    }
    date_min_ref <- if (length(date_min_ref) > 0) date_min_ref[1] else NA_character_
    date_max_ref <- if (!is.null(date_ref_bounds)) {
      date_ref_bounds %>%
        filter(cdisc_variable == var_name, bound_type == "max_date", ref_cdisc_variable %in% colnames(data)) %>%
        pull(ref_cdisc_variable) %>%
        unique()
    } else {
      character(0)
    }
    date_max_ref <- if (length(date_max_ref) > 0) date_max_ref[1] else NA_character_

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
        } else if (ft %in% c("radio_button", "check_box")) {
          cs <- codes[[1]]
          if (length(cs) == 0) {
            rep(NA_character_, nn)
          } else if (ft == "check_box") {
            sample_check_box_values(cs, nn)
          } else {
            sample(cs, nn, replace = TRUE)
          }
        } else if (ft == "date") {
          if (is.na(date_min_ref) && is.na(date_max_ref)) {
            as.character(sample(seq(as.Date(registration_start_date), Sys.Date(), by = "day"), nn, replace = TRUE))
          } else {
            lower <- rep(as.Date(registration_start_date), nn)
            if (!is.na(date_min_ref)) lower <- pmax(lower, as.Date(.data[[date_min_ref]]), na.rm = TRUE)
            upper <- rep(Sys.Date(), nn)
            if (!is.na(date_max_ref)) upper <- pmin(upper, as.Date(.data[[date_max_ref]]), na.rm = TRUE)
            upper <- pmax(upper, lower)
            as.character(as.Date(floor(runif(nn, as.numeric(lower), as.numeric(upper) + 1)), origin = "1970-01-01"))
          }
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
                                 exclude_prefixes = c("DM", "AE", "DS"), coding_block_prefixes = c("MH"), repeated_prefixes = character(0), built_domains = list(), age_bounds = NULL, multi_record_alias_names = character(0), who_drug_idf = NULL, active_sheet_table = NULL, visit_lookup = NULL, discontinuation_date = NULL, date_ref_bounds = NULL) {
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
        visit_lookup = visit_lookup, discontinuation_date = discontinuation_date, date_ref_bounds = date_ref_bounds
      )
    } else {
      build_generic_domain(
        dm, spec, px, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds,
        add_coding_block = px %in% coding_block_prefixes,
        built_domains = built_domains, cdisc_variable_to_prefix = cdisc_variable_to_prefix, age_bounds = age_bounds,
        multi_record_alias_names = multi_record_alias_names, who_drug_idf = who_drug_idf, active_sheet_table = active_sheet_table,
        visit_lookup = visit_lookup, discontinuation_date = discontinuation_date, date_ref_bounds = date_ref_bounds
      )
    }
  }

  # built_domainsの中にはalias_name/label(他ドメイン参照の突き合わせキー)が残っている場合があるため、
  # 返り値を作る最後の段階でのみ取り除く
  built_domains[prefixes] %>% map(~ select(.x, -any_of(c("alias_name", "label"))))
}

# ae/sae_reportのように、AE報告と同じフォーム上の他prefixブロック(例: FA)は、
# 既にpopulate_ae_domain側で(AE報告と同じ行として)生成済みのため、
# build_other_domains側では二重生成しないよう該当のprefix/alias_nameをcdisc_variable_valuesから除外する
exclude_ae_linked_prefixes <- function(cdisc_variable_values, ae_linked_domains) {
  ae_linked_prefix_alias <- if (length(ae_linked_domains) > 0) {
    ae_linked_domains %>% imap_dfr(~ tibble(prefix = .y, alias_name = unique(.x[["alias_name"]])))
  } else {
    tibble(prefix = character(0), alias_name = character(0))
  }
  cdisc_variable_values %>% anti_join(ae_linked_prefix_alias, by = c("prefix", "alias_name"))
}

# AE報告と同じ行として生成したリンク先ブロック(例: FA)を、対応するドメインにマージする
merge_linked_domains <- function(other_domains, ae_linked_domains) {
  for (linked_prefix in names(ae_linked_domains)) {
    fragment <- ae_linked_domains[[linked_prefix]] %>% select(-alias_name)
    merged <- if (linked_prefix %in% names(other_domains)) {
      bind_rows(other_domains[[linked_prefix]], fragment)
    } else {
      fragment
    }
    other_domains[[linked_prefix]] <- merged %>%
      add_seq(str_c(linked_prefix, "SEQ")) %>%
      reorder_domain_columns(front_cols = domain_front_cols(linked_prefix))
  }
  other_domains
}

# other_domainsのうち存在するドメインにだけ、対応するORRES整形関数(populate_lb_orres等)を適用する
apply_orres_populators <- function(other_domains, populators) {
  for (domain_name in names(populators)) {
    if (domain_name %in% names(other_domains)) {
      other_domains[[domain_name]] <- populators[[domain_name]](other_domains[[domain_name]])
    }
  }
  other_domains
}
