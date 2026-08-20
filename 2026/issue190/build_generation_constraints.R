library(tidyverse)

# validator_table + df_cdiscから、ダミーデータ生成で使う制約テーブル一式を組み立てて返す:
# presence_conditions, required_vars, numeric_bounds, field_ref_bounds
build_generation_constraints <- function(validator_table, df_cdisc) {
  field_to_cdisc_variable <- df_cdisc %>% distinct(alias_name, field, cdisc_variable)
  field_to_label <- df_cdisc %>% distinct(alias_name, field, label)

  # validate_presence_if(例: field22==2 || field22=='5<=')を、field名からcdisc_variable名に変換したうえで
  # (cdisc_variable, ref_cdisc_variable, ref_alias_name, ref_label, expected_value)のテーブルにする。
  # ref_alias_name/ref_labelは参照先フィールド(例: field22)自身が属するブロックを指す。
  # RS(繰り返し項目)がSC(別labelの繰り返し項目)を参照するような場合、参照元自身のlabelではなく、
  # この固定されたref_labelのレコードを見る必要があるため
  presence_conditions <- validator_table %>%
    filter(!is.na(presence_ref_field)) %>%
    distinct(alias_name, field_name, presence_ref_field, presence_ref_value) %>%
    left_join(field_to_cdisc_variable, by = c("alias_name", "field_name" = "field")) %>%
    left_join(
      field_to_cdisc_variable %>% rename(ref_cdisc_variable = cdisc_variable),
      by = c("alias_name", "presence_ref_field" = "field")
    ) %>%
    left_join(
      field_to_label %>% rename(ref_label = label),
      by = c("alias_name", "presence_ref_field" = "field")
    ) %>%
    transmute(cdisc_variable, ref_cdisc_variable, ref_alias_name = alias_name, ref_label, expected_value = presence_ref_value, condition_type = "equals") %>%
    filter(!is.na(cdisc_variable), !is.na(ref_cdisc_variable)) %>%
    separate_rows(expected_value, sep = ",\\s*")

  # validate_presence_if/validate_formula_if(例: STAT.blank?、ORRES.present?)を
  # "接尾辞.blank?"/"接尾辞.present?"形式として解釈する。同じcdisc_sheet_configsブロック(=同じlabel)内で
  # その接尾辞を持つcdisc_variable(例: FASTAT)が空白/非空白のときだけ値を設定する、という意味。
  # ref_labelはNAのままにし、参照元自身のlabel(同じブロック)で突き合わせる
  # blank -> ref_cdisc_variableが""と一致する場合のみ設定(condition_type="equals")
  # present -> ref_cdisc_variableが空白でない場合のみ設定(condition_type="not_blank")
  field_to_prefix <- df_cdisc %>% distinct(alias_name, field, prefix)
  presence_predicate_conditions <- validator_table %>%
    filter(!is.na(presence_predicate_suffix)) %>%
    distinct(alias_name, field_name, presence_predicate_suffix, presence_predicate_type) %>%
    left_join(field_to_cdisc_variable, by = c("alias_name", "field_name" = "field")) %>%
    left_join(field_to_prefix, by = c("alias_name", "field_name" = "field")) %>%
    mutate(
      ref_cdisc_variable = str_c(prefix, presence_predicate_suffix),
      ref_alias_name = alias_name,
      ref_label = NA_character_,
      condition_type = if_else(presence_predicate_type == "blank", "equals", "not_blank"),
      expected_value = if_else(presence_predicate_type == "blank", "", NA_character_)
    ) %>%
    transmute(cdisc_variable, ref_cdisc_variable, ref_alias_name, ref_label, expected_value, condition_type) %>%
    filter(!is.na(cdisc_variable), !is.na(ref_cdisc_variable))

  presence_conditions <- bind_rows(presence_conditions, presence_predicate_conditions)

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
