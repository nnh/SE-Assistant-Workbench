library(tidyverse)

# validator_table + df_cdiscから、ダミーデータ生成で使う制約テーブル一式を組み立てて返す:
# presence_conditions, required_vars, numeric_bounds, field_ref_bounds
build_generation_constraints <- function(validator_table, df_cdisc) {
  field_to_cdisc_variable <- df_cdisc %>% distinct(alias_name, field, cdisc_variable)

  # validate_presence_if(例: field6=='Y')を、field名からcdisc_variable名に変換したうえで
  # (cdisc_variable, ref_cdisc_variable, expected_value)のテーブルにする。
  # ref_cdisc_variableの値がexpected_valueと一致しない場合、cdisc_variableは空白にする
  presence_conditions <- validator_table %>%
    filter(!is.na(presence_ref_field)) %>%
    distinct(alias_name, field_name, presence_ref_field, presence_ref_value) %>%
    left_join(field_to_cdisc_variable, by = c("alias_name", "field_name" = "field")) %>%
    left_join(
      field_to_cdisc_variable %>% rename(ref_cdisc_variable = cdisc_variable),
      by = c("alias_name", "presence_ref_field" = "field")
    ) %>%
    transmute(cdisc_variable, ref_cdisc_variable, expected_value = presence_ref_value) %>%
    filter(!is.na(cdisc_variable), !is.na(ref_cdisc_variable)) %>%
    separate_rows(expected_value, sep = ",\\s*")

  # validate_presence_if(例: STAT.blank?)を、"接尾辞.blank?"形式として解釈する。
  # 同じcdisc_sheet_configsブロック(=同じprefix)内でその接尾辞を持つcdisc_variable(例: FASTAT)が
  # 空白のときだけ値を設定する、という意味なので expected_value="" として扱う
  field_to_prefix <- df_cdisc %>% distinct(alias_name, field, prefix)
  presence_blank_conditions <- validator_table %>%
    filter(!is.na(presence_blank_suffix)) %>%
    distinct(alias_name, field_name, presence_blank_suffix) %>%
    left_join(field_to_cdisc_variable, by = c("alias_name", "field_name" = "field")) %>%
    left_join(field_to_prefix, by = c("alias_name", "field_name" = "field")) %>%
    mutate(ref_cdisc_variable = str_c(prefix, presence_blank_suffix), expected_value = "") %>%
    transmute(cdisc_variable, ref_cdisc_variable, expected_value) %>%
    filter(!is.na(cdisc_variable), !is.na(ref_cdisc_variable))

  presence_conditions <- bind_rows(presence_conditions, presence_blank_conditions)

  # validator_type=="presence"のレコードを持つcdisc_variable(必須項目)の一覧。
  # ここに含まれないradio_button項目は空白も選択肢として許容する
  required_vars <- validator_table %>%
    filter(validator_type == "presence") %>%
    distinct(alias_name, field_name) %>%
    left_join(field_to_cdisc_variable, by = c("alias_name", "field_name" = "field")) %>%
    pull(cdisc_variable) %>%
    unique() %>%
    na.omit()

  # bound_type/numeric_valueが入っている行(date/numericality/formulaの数値上限・下限)を
  # field名からcdisc_variable名に変換し、(cdisc_variable, min_value, max_value)のワイド形式にする。
  # 同じ変数に複数の制約がある場合は、より厳しい方(min_valueは最大、max_valueは最小)を採用する
  numeric_bounds <- validator_table %>%
    filter(!is.na(bound_type), !is.na(numeric_value), bound_type %in% c("min_value", "max_value")) %>%
    distinct(alias_name, field_name, bound_type, numeric_value) %>%
    left_join(field_to_cdisc_variable, by = c("alias_name", "field_name" = "field")) %>%
    filter(!is.na(cdisc_variable)) %>%
    group_by(cdisc_variable) %>%
    summarise(
      min_value = suppressWarnings(max(numeric_value[bound_type == "min_value"], na.rm = TRUE)),
      max_value = suppressWarnings(min(numeric_value[bound_type == "max_value"], na.rm = TRUE)),
      .groups = "drop"
    ) %>%
    mutate(
      min_value = if_else(is.infinite(min_value), NA_real_, min_value),
      max_value = if_else(is.infinite(max_value), NA_real_, max_value)
    )

  # formulaでフィールド同士を比較している行(例: f350<=f59)を、field名からcdisc_variable名に変換し、
  # (cdisc_variable, ref_cdisc_variable, bound_type)のテーブルにする。
  # ref_field != field_nameで絞ることで、f18<=3のような自己参照(数値リテラル)行を除外する
  field_ref_bounds <- validator_table %>%
    filter(validator_type == "formula", !is.na(bound_type), !is.na(ref_field), ref_field != field_name) %>%
    distinct(alias_name, field_name, ref_field, bound_type) %>%
    left_join(field_to_cdisc_variable, by = c("alias_name", "field_name" = "field")) %>%
    left_join(
      field_to_cdisc_variable %>% rename(ref_cdisc_variable = cdisc_variable),
      by = c("alias_name", "ref_field" = "field")
    ) %>%
    transmute(cdisc_variable, ref_cdisc_variable, bound_type) %>%
    filter(!is.na(cdisc_variable), !is.na(ref_cdisc_variable))

  list(
    presence_conditions = presence_conditions,
    required_vars = required_vars,
    numeric_bounds = numeric_bounds,
    field_ref_bounds = field_ref_bounds
  )
}
