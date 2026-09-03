library(jsonlite)
library(tidyverse)
library(here)

source(here("constant.R"))
source(here("user_input.R"))
source(here("generate_random_date.R"))
source(here("generate_brthdtc.R"))
source(here("build_dm_domain.R"))
source(here("build_ae_domain.R"))
source(here("build_meddra_soc_pt_llt.R"))
source(here("build_ds_domain.R"))
source(here("build_validator_table.R"))
source(here("build_cdisc_variable_values.R"))
source(here("build_generation_constraints.R"))
source(here("build_field_reference_table.R"))
source(here("lb_reference_ranges.R"))
source(here("tr_orres_values.R"))
source(here("vs_orres_values.R"))
source(here("read_who_drug_idf.R"))

# json_path(EDC仕様JSON)からDM/AE/DS/その他ドメインのダミーデータ一式を生成する。
# テスト・バリデーション専用(json_pathはtest_config.Rで管理する)。生成過程の全ての中間オブジェクト
# (edc_spec, sheets, cdisc_variable_values, presence_conditions, dm, ae, ds, other_domains等)を
# 呼び出し元のグローバル環境に代入するため、呼んだ後はそれらをそのまま参照できる
# (例: source(here("test_config.R")); source(here("load_edc_spec.R")); load_edc_spec(json_path))
load_edc_spec <- function(json_path) {
  edc_spec <- jsonlite::read_json(json_path)
  sheets <- edc_spec[["sheets"]]
  sheet_groups <- edc_spec[["sheet_groups"]]

  cdisc <- build_cdisc_variable_values(edc_spec, sheets)
  df_cdisc <- cdisc[["df_cdisc"]]
  cdisc_variable_values <- cdisc[["cdisc_variable_values"]]

  validator_table <- build_validator_table(sheets)
  field_reference_table <- build_field_reference_table(sheets)

  # sheetsのcategoryが"ae_report"または"multiple"のalias_name一覧。
  # 該当するドメインのSPIDはAEドメインと同じ形式(alias_name + USUBJID内の連番)にする
  multi_record_alias_names <- sheets %>%
    keep(~ !is.null(.x[["category"]]) && .x[["category"]] %in% c("ae_report", "multiple")) %>%
    map_chr(~ .x[["alias_name"]])

  constraints <- build_generation_constraints(validator_table, df_cdisc, field_reference_table)
  presence_conditions <- constraints[["presence_conditions"]]
  required_vars <- constraints[["required_vars"]]
  required_var_instances <- constraints[["required_var_instances"]]
  numeric_bounds <- constraints[["numeric_bounds"]]
  field_ref_bounds <- constraints[["field_ref_bounds"]]
  date_ref_bounds <- constraints[["date_ref_bounds"]]
  age_bounds <- constraints[["age_bounds"]]

  # cdisc_variable_values(各生成関数にspecとして渡されるテーブル)に、そのalias_name/label/
  # cdisc_variableのインスタンスが実際にpresenceバリデータを持つかどうか(is_required)を付与する。
  # required_vars(cdisc_variable名だけでunique化したフラット版)と違い、同じcdisc_variable名が
  # 複数のalias_name/labelに定義されていても、インスタンスごとに正確に必須/非必須を判定できる。
  # labelがNAの行同士はleft_joinでマッチしないため、joinキーとしては空文字列に揃えてから結合する
  cdisc_variable_values <- cdisc_variable_values %>%
    mutate(join_label = coalesce(label, "")) %>%
    left_join(
      required_var_instances %>% mutate(join_label = coalesce(label, ""), is_required = TRUE) %>% select(-label),
      by = c("alias_name", "join_label", "cdisc_variable")
    ) %>%
    mutate(is_required = coalesce(is_required, FALSE)) %>%
    select(-join_label)

  # MedDRA
  meddra <- build_meddra_hierarchy(meddra_version)

  # WhoDrug/IDF
  who_drug_idf <- build_who_drug_idf(who_drug_idf_parent_dir, who_drug_idf_version_folder)

  # DM
  # STUDYIDはEDC仕様JSONのname(試験名)に"_dummy"を付けたものにする。固定のダミー値だと
  # どのJSONから生成したデータか分からなくなるため、生成データを見ただけで試験を判別できるようにする
  studyid <- str_c(edc_spec[["name"]], "_dummy")
  dm_result <- build_dm_domain(sheets, sheet_groups, n = registration_n, age_bounds = age_bounds, studyid = studyid)
  dm <- dm_result[["dm"]]
  active_sheet_table <- active_sheet_membership_table(dm_result[["active_sheets"]])
  visit_lookup <- build_visit_lookup(sheets, edc_spec[["visits"]])
  dm <- populate_dm_domain(dm, cdisc_variable_values, registration_start_date, meddra, presence_conditions, numeric_bounds, field_ref_bounds, age_bounds, date_ref_bounds)
  # AE
  ae <- dm %>% build_ae_domain()
  ae_result <- populate_ae_domain(ae, cdisc_variable_values, registration_start_date, meddra, presence_conditions, numeric_bounds, field_ref_bounds, required_ae_llt_codes, who_drug_idf, active_sheet_table, date_ref_bounds)
  ae <- ae_result[["ae"]]
  ae_linked_domains <- ae_result[["linked"]]
  death_date <- build_death_date_table(ae)
  # DS
  ds <- build_ds_domain(dm, cdisc_variable_values)
  ds <- populate_ds_domain(ds, cdisc_variable_values, registration_start_date, meddra, presence_conditions, numeric_bounds, field_ref_bounds, date_ref_bounds)
  ds <- finalize_ds_disposition(ds, death_date, cdisc_variable_values)
  discontinuation_date <- build_discontinuation_date_table(ds)
  ds <- add_randomization_ds_rows(ds, dm, registration_start_date)

  # ae/sae_reportのように、AE報告と同じフォーム上の他prefixブロック(例: FA)は、
  # 既にpopulate_ae_domain側で(AE報告と同じ行として)生成済みのため、
  # build_other_domains側では二重生成しないよう該当のprefix/alias_nameを除外する
  cdisc_variable_values_for_others <- exclude_ae_linked_prefixes(cdisc_variable_values, ae_linked_domains)

  # その他のドメイン(DM/AE/DS以外)。同じalias_name内でcdisc_variableが複数labelを持つドメインは自動判定される。
  # 他ドメイン(DM/AE/DS含む)の変数を参照するpresence_conditions/field_ref_boundsがある場合は、
  # 依存順に生成し、built_domainsで既存のDM/AE/DSも参照できるようにする
  other_domains <- build_other_domains(
    dm, cdisc_variable_values_for_others, registration_start_date, meddra, presence_conditions, required_var_instances, numeric_bounds, field_ref_bounds,
    built_domains = list(DM = dm, AE = ae, DS = ds), age_bounds = age_bounds, multi_record_alias_names = multi_record_alias_names, who_drug_idf = who_drug_idf,
    active_sheet_table = active_sheet_table, visit_lookup = visit_lookup, discontinuation_date = discontinuation_date, date_ref_bounds = date_ref_bounds
  )

  # alias_name/label/sheet_seqは他ドメイン生成時の突き合わせキーやDSSEQ並び替えに使い終わったため、
  # 最終出力からは取り除く
  ds <- ds %>% select(-any_of(c("alias_name", "label", "sheet_seq")))

  # AE報告と同じ行として生成したリンク先ブロック(例: FA)を、対応するドメインにマージする
  other_domains <- merge_linked_domains(other_domains, ae_linked_domains)

  # LB/TR/VSのORRESを、それぞれの基準範囲・条件に基づいたそれらしい数値に置き換える
  # (対応するドメインが存在しない、またはTESTCD/ORRES列が無い場合は何もしない)
  other_domains <- apply_orres_populators(other_domains, list(
    LB = populate_lb_orres,
    TR = populate_tr_orres,
    VS = populate_vs_orres
  ))

  # DD(死因)は死亡した被験者のみのレコードにする(DDTEST/DDTESTCDのような固定値の列ではなく、
  # presence_conditionsで条件付けされている列(例: DDORRES)が全てNAの行を除外)
  if ("DD" %in% names(other_domains)) {
    dd_gated_vars <- presence_conditions %>% filter(cdisc_variable %in% colnames(other_domains[["DD"]])) %>% pull(cdisc_variable) %>% unique()
    other_domains[["DD"]] <- drop_empty_domain_rows(other_domains[["DD"]], dd_gated_vars)
  }

  # prefixSEQ列を持つドメインは、その列で行を並べ替えておく(mergeやfilter等で崩れた行順を
  # 最終出力前に揃えるため)
  ae <- sort_by_seq(ae, "AE")
  dm <- sort_by_seq(dm, "DM")
  ds <- sort_by_seq(ds, "DS")
  other_domains <- other_domains %>% imap(sort_by_seq)

  # 生成データ(ae/dm/ds/other_domains)をCSVとして出力する(ドメイン名の大文字+"_dummy.csv"、例: DM_dummy.csv)。
  # RのNAは空欄として書き出す(コードリストの選択肢として文字列"NA"が使われているケースがあるため、
  # 空欄と文字列としての"NA"を区別できるようにするため)
  if (!dir.exists(output_csv_dir)) dir.create(output_csv_dir, recursive = TRUE)
  export_datasets <- c(list(AE = ae, DM = dm, DS = ds), other_domains)
  iwalk(export_datasets, ~ write_csv(.x, file.path(output_csv_dir, str_c(.y, "_dummy.csv")), na = ""))

  # 生成過程の全オブジェクト(dm/ae/ds/cdisc_variable_values/presence_conditions等)を、
  # 呼び出し元のグローバル環境に代入する(source()実行後の状態と同様に直接参照できるようにするため)
  list2env(as.list(environment()), envir = .GlobalEnv)
  invisible(NULL)
}
