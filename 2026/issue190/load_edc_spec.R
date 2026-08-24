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
source(here("build_validator_table.R"))
source(here("build_cdisc_variable_values.R"))
source(here("build_generation_constraints.R"))
source(here("build_field_reference_table.R"))
source(here("lb_reference_ranges.R"))
source(here("tr_orres_values.R"))
source(here("vs_orres_values.R"))
source(here("read_who_drug_idf.R"))
registration_n <- 100
registration_start_date <- "2024-04-01"
json_path <- '/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/20260408大塚引継用/入力ファイル(JSON)/forTest_input_AML224-FLT3-ITD/AML224-FLT3-ITD_250929_1501.json'
# json_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Stat/Trials/HMCSG/HMCSG-Tucidinostat-rrPTCL/specs/EDC/Tucidinostat-rrPTCL_260616_1112.json"
#json_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/20260408大塚引継用/入力ファイル(JSON)/forTest_input_Bev-FOLFOX-SBC/Bev-FOLFOX-SBC_250929_1501.json"
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
meddra <- build_meddra_hierarchy()

# WhoDrug/IDF
who_drug_idf <- build_who_drug_idf(who_drug_idf_parent_dir, who_drug_idf_version_folder)

# DM
dm <- build_dm_domain(sheets, n = registration_n)
dm <- populate_dm_domain(dm, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds, age_bounds)
# AE
ae <- dm %>% build_ae_domain()
ae <- populate_ae_domain(ae, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds)
death_date <- build_death_date_table(ae)
# DS
ds <- build_ds_domain(dm, cdisc_variable_values)
ds <- populate_ds_domain(ds, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds)
ds <- finalize_ds_disposition(ds, death_date)
discontinuation_date <- build_discontinuation_date_table(ds)
ds <- add_randomization_ds_rows(ds, dm, registration_start_date)

# その他のドメイン(DM/AE/DS以外)。同じalias_name内でcdisc_variableが複数labelを持つドメインは自動判定される。
# 他ドメイン(DM/AE/DS含む)の変数を参照するpresence_conditions/field_ref_boundsがある場合は、
# 依存順に生成し、built_domainsで既存のDM/AE/DSも参照できるようにする
other_domains <- build_other_domains(
  dm, cdisc_variable_values, registration_start_date, meddra, presence_conditions, required_vars, numeric_bounds, field_ref_bounds,
  built_domains = list(DM = dm, AE = ae, DS = ds), age_bounds = age_bounds, multi_record_alias_names = multi_record_alias_names, who_drug_idf = who_drug_idf
)

# LBORRESを基準範囲に基づいたそれらしい数値に置き換える(LBTESTCD/LBORRESが無ければ何もしない)
if ("LB" %in% names(other_domains)) {
  other_domains[["LB"]] <- populate_lb_orres(other_domains[["LB"]])
}

# TRORRESはTRTESTCDがLDIAM/SAXISのときだけそれらしい数値(mm)に置き換える(それ以外は変更しない)
if ("TR" %in% names(other_domains)) {
  other_domains[["TR"]] <- populate_tr_orres(other_domains[["TR"]])
}

# VSORRESを基準範囲に基づいたそれらしい数値に置き換える(VSTESTCD/VSORRESが無ければ何もしない)
if ("VS" %in% names(other_domains)) {
  other_domains[["VS"]] <- populate_vs_orres(other_domains[["VS"]])
}
