library(tidyverse)

# field_items$validatorsを(alias_name, field_name, validator_type, validator_key, value)の縦持りtibbleにする。
# validatorsが無いsheet/field、キー構成が不定な場合(presenceのようにnamed list()のみのケースを含む)でもエラーにならない
build_validator_table_raw <- function(sheets) {
  sheets %>%
    map_dfr(function(sheet) {
      field_items <- sheet[["field_items"]]
      if (length(field_items) == 0) {
        return(tibble())
      }

      field_table <- field_items %>%
        map_dfr(function(field) {
          validators <- field[["validators"]]
          if (length(validators) == 0) {
            return(tibble())
          }

          validators %>%
            imap_dfr(function(rules, validator_type) {
              if (length(rules) == 0) {
                tibble(validator_type = validator_type, validator_key = NA_character_, value = NA_character_)
              } else {
                rules %>%
                  imap_dfr(~ tibble(
                    validator_type = validator_type,
                    validator_key = .y,
                    value = paste(unlist(.x), collapse = ", ")
                  ))
              }
            }) %>%
            mutate(field_name = field[["name"]], .before = 1)
        })

      if (nrow(field_table) == 0) {
        return(tibble())
      }
      field_table %>% mutate(alias_name = sheet[["alias_name"]], .before = 1)
    })
}

# validator_keyから、下限か上限かを判定する。date型は日付の以降/以前、numericality型は数値の以上/以下
classify_bound_type <- function(validator_type, validator_key) {
  case_when(
    validator_type == "date" & validator_key == "validate_date_after_or_equal_to" ~ "min_date",
    validator_type == "date" & validator_key == "validate_date_before_or_equal_to" ~ "max_date",
    validator_type == "numericality" & validator_key == "validate_numericality_greater_than_or_equal_to" ~ "min_value",
    validator_type == "numericality" & validator_key == "validate_numericality_less_than_or_equal_to" ~ "max_value",
    TRUE ~ NA_character_
  )
}

# validator_type=="numericality"の場合、valueが数値ならその数値を取り出す(数値でなければNA)
extract_numeric_value <- function(validator_type, value) {
  if_else(validator_type == "numericality", suppressWarnings(as.numeric(value)), NA_real_)
}

# valueに含まれる特殊な参照値を実際の値に解決する。今のところ date型の"Date.current"(今日の日付)のみ対応
resolve_validator_value <- function(validator_type, value) {
  if_else(validator_type == "date" & value == "Date.current", as.character(Sys.Date()), value)
}

# valueが"field3"のような同一シート内の別フィールド参照の場合、その参照先フィールド名を取り出す。
# 参照先のfield_typeはdateである前提とする
extract_ref_field <- function(validator_type, value) {
  if_else(validator_type == "date" & str_detect(value, "^field[0-9]+$"), value, NA_character_)
}

# value(例: field2=='ADVERSE EVENT'、f4=='Y' || f4=='N')を"||"で分割し、
# 全断片が同一フィールドに対する fieldN=='値'(または fN=='値') の形であれば、
# フィールド名と値の一覧を返す。異なるフィールドが混ざる場合やパースできない断片があればNULL(未対応)
parse_presence_or_conditions <- function(value) {
  fragments <- value %>% str_split("\\|\\|") %>% pluck(1) %>% str_trim()
  m <- str_match(fragments, "^(?:field|f)([0-9]+)\\s*==\\s*'([^']*)'$")
  if (any(is.na(m[, 1]))) {
    return(NULL)
  }
  field_nums <- unique(m[, 2])
  if (length(field_nums) != 1) {
    return(NULL)
  }
  list(field = str_c("field", field_nums), values = m[, 3])
}

# validator_type=="presence" & validator_key=="validate_presence_if"の場合、
# 同一フィールドに対するOR条件から参照フィールド名を取り出す。この条件を満たす時のみ値を設定する
extract_presence_ref_field <- function(validator_type, validator_key, value) {
  is_target <- coalesce(validator_type == "presence" & validator_key == "validate_presence_if", FALSE)
  map2_chr(is_target, value, function(target, v) {
    if (!target) return(NA_character_)
    parsed <- parse_presence_or_conditions(v)
    if (is.null(parsed)) return(NA_character_)
    parsed[["field"]]
  })
}

# 上記と同じ条件式から、条件が真になるための期待値の一覧を","区切りで取り出す(例: 'Y, N')
extract_presence_ref_value <- function(validator_type, validator_key, value) {
  is_target <- coalesce(validator_type == "presence" & validator_key == "validate_presence_if", FALSE)
  map2_chr(is_target, value, function(target, v) {
    if (!target) return(NA_character_)
    parsed <- parse_presence_or_conditions(v)
    if (is.null(parsed)) return(NA_character_)
    str_c(parsed[["values"]], collapse = ", ")
  })
}

# validator_type=="formula" & validator_key=="validate_formula_if"の場合、
# value(例: f18<=3)が単一フィールドに対する条件のときだけ判定する(f18 -> field18)。
# age(f2, f3)>=20のような複数フィールドにまたがる式は対象外(NA)とする
formula_single_field_pattern <- "^f([0-9]+)\\s*(<=|>=|==|<|>)\\s*(-?[0-9]+(?:\\.[0-9]+)?)$"

extract_formula_ref_field <- function(validator_type, validator_key, value) {
  is_target <- validator_type == "formula" & validator_key == "validate_formula_if"
  m <- str_match(value, formula_single_field_pattern)
  ref_field <- if_else(!is.na(m[, 1]), str_c("field", m[, 2]), NA_character_)
  if_else(is_target, ref_field, NA_character_)
}

# 上記と同じ条件式から、演算子に応じて上限(max_value)/下限(min_value)を判定する
classify_formula_bound_type <- function(validator_type, validator_key, value) {
  is_target <- validator_type == "formula" & validator_key == "validate_formula_if"
  operator <- str_match(value, formula_single_field_pattern)[, 3]
  bound_type <- case_when(
    operator %in% c("<=", "<") ~ "max_value",
    operator %in% c(">=", ">") ~ "min_value",
    operator == "==" ~ "exact_value",
    TRUE ~ NA_character_
  )
  if_else(is_target, bound_type, NA_character_)
}

# 上記と同じ条件式から、比較対象の数値を取り出す
extract_formula_bound_value <- function(validator_type, validator_key, value) {
  is_target <- validator_type == "formula" & validator_key == "validate_formula_if"
  bound_value <- suppressWarnings(as.numeric(str_match(value, formula_single_field_pattern)[, 4]))
  if_else(is_target, bound_value, NA_real_)
}

# value(例: f350<=f59)が同一シート内の別フィールドとの比較のときだけ判定する(比較先: f59 -> field59)。
# age(f2, f3)>=20のような関数呼び出しを含む式は対象外(NA)とする
formula_field_ref_pattern <- "^f([0-9]+)\\s*(<=|>=|==|<|>)\\s*f([0-9]+)$"

# value(例: f350<=f59)から比較先フィールド名(field59)を取り出す
extract_formula_field_ref <- function(validator_type, validator_key, value) {
  is_target <- validator_type == "formula" & validator_key == "validate_formula_if"
  m <- str_match(value, formula_field_ref_pattern)
  ref_field <- if_else(!is.na(m[, 1]), str_c("field", m[, 4]), NA_character_)
  if_else(is_target, ref_field, NA_character_)
}

# 上記と同じ条件式から、演算子に応じて比較先フィールドが上限(max_value)/下限(min_value)かを判定する
classify_formula_field_ref_bound_type <- function(validator_type, validator_key, value) {
  is_target <- validator_type == "formula" & validator_key == "validate_formula_if"
  operator <- str_match(value, formula_field_ref_pattern)[, 3]
  bound_type <- case_when(
    operator %in% c("<=", "<") ~ "max_value",
    operator %in% c(">=", ">") ~ "min_value",
    operator == "==" ~ "exact_value",
    TRUE ~ NA_character_
  )
  if_else(is_target, bound_type, NA_character_)
}

# sheetsからvalidator_tableを組み立て、resolved_value/bound_type/ref_field/numeric_value/
# presence_ref_field/presence_ref_valueまで付与した最終形を返す
build_validator_table <- function(sheets) {
  build_validator_table_raw(sheets) %>%
    mutate(
      resolved_value = resolve_validator_value(validator_type, value),
      bound_type = coalesce(
        classify_bound_type(validator_type, validator_key),
        classify_formula_bound_type(validator_type, validator_key, value),
        classify_formula_field_ref_bound_type(validator_type, validator_key, value)
      ),
      ref_field = coalesce(
        extract_ref_field(validator_type, value),
        extract_formula_ref_field(validator_type, validator_key, value),
        extract_formula_field_ref(validator_type, validator_key, value)
      ),
      numeric_value = coalesce(
        extract_numeric_value(validator_type, value),
        extract_formula_bound_value(validator_type, validator_key, value)
      ),
      presence_ref_field = extract_presence_ref_field(validator_type, validator_key, value),
      presence_ref_value = extract_presence_ref_value(validator_type, validator_key, value)
    )
}
