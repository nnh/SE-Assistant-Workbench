rm(list = ls())
library(jsonlite)
library(tidyverse)
library(here)

source(here("constant.R"))
source(here("generate_random_date.R"))
source(here("generate_brthdtc.R"))
source(here("build_dm_domain.R"))
source(here("build_ae_domain.R"))
source(here("build_meddra_soc_pt_llt.R"))
source(here("build_ds_domain.R"))
registration_n <- 100
registration_start_date <- "2024-04-01"

json_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Stat/Trials/HMCSG/HMCSG-Tucidinostat-rrPTCL/specs/EDC/Tucidinostat-rrPTCL_260616_1112.json"
#json_path <- '/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/20260408大塚引継用/入力ファイル(JSON)/forTest_input_Bev-FOLFOX-SBC/Bev-FOLFOX-SBC_250929_1501.json'
edc_spec <- jsonlite::read_json(json_path)
sheets <- edc_spec[["sheets"]]
sheet_groups <- edc_spec[["sheet_groups"]]

# sheet_groups(グループ情報 + ネストしたsheets)をシート単位で展開したtibbleにする
sheet_group_table <- sheet_groups %>%
  map_dfr(~ tibble(
    group_uuid = .$uuid,
    group_name = .$name,
    group_alias_name = .$alias_name,
    allocation_group = .$allocation_group,
    is_default = .$is_default,
    sheet_alias_name = map_chr(.$sheets, ~ .x$alias_name)
  ))

# field_items$validatorsを(alias_name, field_name, validator_type, validator_key, value)の縦持りtibbleにする。
# validatorsが無いsheet/field、キー構成が不定な場合(presenceのようにnamed list()のみのケースを含む)でもエラーにならない
build_validator_table <- function(sheets) {
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

# validator_type=="presence" & validator_key=="validate_presence_if"の場合、
# value(例: field2=='ADVERSE EVENT')から参照フィールド名を取り出す。この条件を満たす時のみ値を設定する
extract_presence_ref_field <- function(validator_type, validator_key, value) {
  is_target <- validator_type == "presence" & validator_key == "validate_presence_if"
  ref_field <- str_match(value, "^\\s*(field[0-9]+)\\s*==")[, 2]
  if_else(is_target, ref_field, NA_character_)
}

# 上記と同じ条件式から、条件が真になるための期待値(例: 'ADVERSE EVENT')を取り出す
extract_presence_ref_value <- function(validator_type, validator_key, value) {
  is_target <- validator_type == "presence" & validator_key == "validate_presence_if"
  ref_value <- str_match(value, "==\\s*'([^']*)'")[, 2]
  if_else(is_target, ref_value, NA_character_)
}

build_cdisc_sheet_config_table <- function(sheet) {
  field_items <- if (length(sheet$field_items) == 0) {
    tibble(field = character(), default_value = character(), is_invisible = character(), field_type = character())
  } else {
    sheet$field_items %>%
      map_dfr(~ tibble(field = .$name, default_value = .$default_value, is_invisible=.$is_invisible,field_type = .$field_type))
  }

  prefix_field_table <- if (length(sheet$cdisc_sheet_configs) == 0) {
    tibble(prefix = character(), field = character(), value = character())
  } else {
    sheet$cdisc_sheet_configs %>%
      map_dfr(~ tibble(
        prefix = .x[["prefix"]],
        field = names(.x[["table"]]),
        value = map_chr(.x[["table"]], ~ if (is.null(.x)) NA_character_ else .x)
      ))
  }

  result <- prefix_field_table %>%
    inner_join(field_items, by = "field") %>%
    filter(!is.na(value), !str_starts(value, "_"))
  result[["alias_name"]] <- sheet$alias_name
  return(result)
}

df_cdisc <- map_dfr(sheets, build_cdisc_sheet_config_table, .id = "sheet_index") %>%
  mutate(cdisc_variable = case_when(
    prefix == "DM" ~ value,
    value == "VISITNUM" ~ value,
    value == "SPDEVID" ~ value,
    TRUE ~ str_c(prefix, value)
  ))

options <- edc_spec$options %>% map_dfr(function(opt) {
  opt$values %>%
    map_dfr(~ tibble(
      value_name = .$name,
      seq = .$seq,
      code = .$code,
      is_usable = .$is_usable
    )) %>%
    mutate(option_name = opt$name, .before = 1)
}) %>% filter(is_usable) %>% select(-is_usable)
options[["is_invisible"]] <- FALSE

field_option <- sheets %>% map_dfr( ~ {
  alias_name <- .$alias_name
  field_items <- .$field_items %>% keep( ~ "option_name" %in% names(.x))
  if (length(field_items) == 0) {
    return()
  }
  result <- field_items %>% map_dfr( ~ tibble(field=.$name, option_name=.$option_name))
  result[["alias_name"]] <- alias_name
  return(result)
})

cdisc_variable_spec <- df_cdisc %>% left_join(field_option, by=c("alias_name", "field")) %>% select(prefix, cdisc_variable, default_value, option_name, is_invisible, field_type, alias_name)
cdisc_variable_values <- cdisc_variable_spec %>% left_join(options, by=c("option_name", "is_invisible"), relationship = "many-to-many")
cdisc_variable_values <- cdisc_variable_values %>% select(-option_name) %>% distinct() %>% arrange(prefix, cdisc_variable)

# sheet_orders(シートの表示順)をalias_name(=sheet)で結合
sheet_order <- edc_spec$sheet_orders %>% map_dfr(~ tibble(alias_name = .$sheet, sheet_seq = .$seq))
cdisc_variable_values <- cdisc_variable_values %>% left_join(sheet_order, by = "alias_name")

validator_table <- build_validator_table(sheets) %>%
  mutate(
    resolved_value = resolve_validator_value(validator_type, value),
    bound_type = classify_bound_type(validator_type, validator_key),
    ref_field = extract_ref_field(validator_type, value),
    numeric_value = extract_numeric_value(validator_type, value),
    presence_ref_field = extract_presence_ref_field(validator_type, validator_key, value),
    presence_ref_value = extract_presence_ref_value(validator_type, validator_key, value)
  )

# validate_presence_if(例: field6=='Y')を、field名からcdisc_variable名に変換したうえで
# (cdisc_variable, ref_cdisc_variable, expected_value)のテーブルにする。
# ref_cdisc_variableの値がexpected_valueと一致しない場合、cdisc_variableは空白にする
field_to_cdisc_variable <- df_cdisc %>% distinct(alias_name, field, cdisc_variable)
presence_conditions <- validator_table %>%
  filter(!is.na(presence_ref_field)) %>%
  distinct(alias_name, field_name, presence_ref_field, presence_ref_value) %>%
  left_join(field_to_cdisc_variable, by = c("alias_name", "field_name" = "field")) %>%
  left_join(
    field_to_cdisc_variable %>% rename(ref_cdisc_variable = cdisc_variable),
    by = c("alias_name", "presence_ref_field" = "field")
  ) %>%
  transmute(cdisc_variable, ref_cdisc_variable, expected_value = presence_ref_value) %>%
  filter(!is.na(cdisc_variable), !is.na(ref_cdisc_variable))

# validator_type=="presence"のレコードを持つcdisc_variable(必須項目)の一覧。
# ここに含まれないradio_button項目は空白も選択肢として許容する
required_vars <- validator_table %>%
  filter(validator_type == "presence") %>%
  distinct(alias_name, field_name) %>%
  left_join(field_to_cdisc_variable, by = c("alias_name", "field_name" = "field")) %>%
  pull(cdisc_variable) %>%
  unique() %>%
  na.omit()

# MedDRA
meddra <- build_meddra_hierarchy()

# DM
dm <- build_dm_domain(n = registration_n)
dm <- populate_dm_domain(dm, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars)
# AE
ae <- dm %>% build_ae_domain()
ae <- populate_ae_domain(ae, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars)
death_date <- build_death_date_table(ae)
# DS
ds <- build_ds_domain(dm, cdisc_variable_values)
ds <- populate_ds_domain(ds, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars)
ds <- finalize_ds_disposition(ds, death_date)
discontinuation_date <- build_discontinuation_date_table(ds)

# その他のドメイン(DM/AE/DS以外)
other_domains <- build_other_domains(dm, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars)
