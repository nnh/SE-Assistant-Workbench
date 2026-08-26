rm(list = ls())
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
#json_path <- "/Users/mariko/Downloads/test20260826/fortest1_260826_1112.json"
#json_path <- "/Users/mariko/Downloads/test20260826/fortest2_260826_1501.json"
json_path <- "/Users/mariko/Downloads/test20260826/fortest3_260826_1452.json"
#json_path <- "/Users/mariko/Downloads/test20260826/fortest4_260826_1501.json"
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
numeric_bounds <- constraints[["numeric_bounds"]]
field_ref_bounds <- constraints[["field_ref_bounds"]]
age_bounds <- constraints[["age_bounds"]]

# MedDRA
meddra <- build_meddra_hierarchy(meddra_version)

# WhoDrug/IDF
who_drug_idf <- build_who_drug_idf(who_drug_idf_parent_dir, who_drug_idf_version_folder)

# DM
dm_result <- build_dm_domain(sheets, sheet_groups, n = registration_n, age_bounds = age_bounds)
dm <- dm_result[["dm"]]
active_sheet_table <- active_sheet_membership_table(dm_result[["active_sheets"]])
visit_lookup <- build_visit_lookup(sheets, edc_spec[["visits"]])
dm <- populate_dm_domain(dm, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds, age_bounds)
# AE
ae <- dm %>% build_ae_domain()
ae_result <- populate_ae_domain(ae, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds, required_ae_llt_codes, who_drug_idf, active_sheet_table)
ae <- ae_result[["ae"]]
ae_linked_domains <- ae_result[["linked"]]
death_date <- build_death_date_table(ae)
# DS
ds <- build_ds_domain(dm, cdisc_variable_values)
ds <- populate_ds_domain(ds, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds)
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
  dm, cdisc_variable_values_for_others, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds,
  built_domains = list(DM = dm, AE = ae, DS = ds), age_bounds = age_bounds, multi_record_alias_names = multi_record_alias_names, who_drug_idf = who_drug_idf,
  active_sheet_table = active_sheet_table, visit_lookup = visit_lookup
)

# alias_name/labelは他ドメイン生成時の突き合わせキーとして使い終わったため、最終出力からは取り除く
ds <- ds %>% select(-any_of(c("alias_name", "label")))

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

# 生成データ(ae/dm/ds/other_domains)をCSVとして出力する(ドメイン名の大文字+"_dummy.csv"、例: DM_dummy.csv)。
# RのNAは空欄として書き出す(コードリストの選択肢として文字列"NA"が使われているケースがあるため、
# 空欄と文字列としての"NA"を区別できるようにするため)
if (!dir.exists(output_csv_dir)) dir.create(output_csv_dir, recursive = TRUE)
export_datasets <- c(list(AE = ae, DM = dm, DS = ds), other_domains)
iwalk(export_datasets, ~ write_csv(.x, file.path(output_csv_dir, str_c(.y, "_dummy.csv")), na = ""))
