library(here)

# validate_datasets_test2.Rと同じ処理(check_cm_baseline1/check_tr_tu_dtc等の特別チェック・
# run_full_validationの呼び出し方まで含め)を行うが、比較元(生成データ)をR版のその場生成ではなく、
# Webツールが生成したCSV(dummy_data.zip展開後)に差し替えたもの。
#
# 事前準備: dm_web_csv_path・ae_web_csv_path・ds_web_csv_path・other_domains_web_csv_dir
# (test_config.R)を、Webツールでfortest2用JSONを読み込んで生成し「ZIPで一括ダウンロード」した
# dummy_data.zipの展開先に設定しておくこと。json_pathは下記でfortest2用に固定しているため、
# test_config.R側の値(他テストと切り替えて使われる)を書き換える必要はない
rm(list = ls())

# このファイル固定のjson_path。test_config.R側のjson_pathは他テストとの切り替えで
# 意図せず別のJSONを指したままになりうる(実際に誤検知の原因になったため)、ここで固定する
json_path <- "/Users/mariko/Downloads/test20260826/fortest2_260826_1501.json"

# check_value_equals(固定値チェック)用のCSV設定ファイルのパス。内容(チェックしたい固定値)は
# 試験ごとに異なるため、test_config.R(共通)ではなくここで指定する。リポジトリ外の任意の場所でよい
fixed_value_checks_csv_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2026/20260826/test2/fixed_value_checks_test2.csv"

source(here("test_config.R"))
# test_config.Rはjson_path(他テストとの切り替え用)も定義するが、このファイルは上で固定した
# json_pathを優先して使うため、test_config.R側の値で上書きしないよう再度設定し直す
json_path <- "/Users/mariko/Downloads/test20260826/fortest2_260826_1501.json"
source(here("tools/validate_common.R"))

# cdisc_variable_values・registration_n・who_drug_idfはEDC仕様(JSON)/辞書由来で被験者データには
# 依存しないため、R側でload_edc_spec()を実行して取得する(このとき同時に生成されるR版の
# ae/dm/ds/other_domains・discontinuation_dateは、このあと全てWeb版CSVの内容で上書きするため使わない)
source(here("load_edc_spec.R"))
load_edc_spec(json_path)

# R版(正しいjson_pathから生成)のSTUDYIDを、Web版CSVとの整合性チェックの期待値として控えておく。
# STUDYID文字列をここに直接書きたくないため、json_pathから実際に生成した値を使う
expected_studyid <- dm[["STUDYID"]][1]

rm(dm)
rm(ae)
rm(ds)
rm(other_domains)

# 被験者データ(ae/dm/ds/other_domains)をWebツールが生成したCSVで上書きする
dm <- read_csv(dm_web_csv_path, col_types = cols(.default = "c"), na = character(0))
ae <- read_csv(ae_web_csv_path, col_types = cols(.default = "c"), na = character(0))
ds <- read_csv(ds_web_csv_path, col_types = cols(.default = "c"), na = character(0))
other_domains <- load_csv_datasets(other_domains_web_csv_dir)
# load_csv_datasets()はファイル名から拡張子を除いた名前をそのままキーにするため、
# Webツールの出力ファイル名(例: CE_dummy.csv)の"_dummy"サフィックスを外してprefix名に揃える
names(other_domains) <- str_remove(names(other_domains), "_dummy$")
# facilities(施設一覧、code/ja/en列。SDTMドメインではないためother_domainsバリデーションの対象外にする)は
# DM.SITEIDとの整合性チェック用に別途取り出しておく
facilities <- other_domains[["facilities"]]
other_domains <- other_domains[setdiff(names(other_domains), c("DM", "AE", "DS", "facilities"))]

# json_pathの設定間違い(意図しない試験のJSONを指している)を、CSVの中身からも検知できるよう、
# 全ドメインのSTUDYIDがR版(正しいjson_path)のものと一致することを確認する
dm %>% check_studyid_matches(expected_studyid, domain_name = "DM")
ae %>% check_studyid_matches(expected_studyid, domain_name = "AE")
ds %>% check_studyid_matches(expected_studyid, domain_name = "DS")
for (prefix in names(other_domains)) {
  other_domains[[prefix]] %>% check_studyid_matches(expected_studyid, domain_name = prefix)
}

registration_n <- nrow(dm)
# discontinuation_dateは被験者ごとの中止日という「その乱数シードでの生成結果」に依存する値のため、
# Web版自身のdsから作り直す(R版のdiscontinuation_dateをそのまま使うと、対応するUSUBJIDの
# 中止日が互いに無関係な値になり誤検知するため)
discontinuation_date <- build_discontinuation_date_table(ds)

# 比較に不要な中間オブジェクトが環境に残らないよう、それら以外は削除する
# (source()より前に行うこと。後だと読み込んだ関数まで削除されてしまう)
rm(list = setdiff(ls(), c("ae", "dm", "ds", "other_domains", "facilities", "cdisc_variable_values", "registration_n", "who_drug_idf", "json_path", "discontinuation_date", "fixed_value_checks_csv_path")))

source(here("tools/validate_common.R"))

# ここから下はvalidate_datasets_test2.Rと共通の処理(CM/TR特別チェック・run_full_validation
# 呼び出し・ドメイン名一覧の確認)。validate_test2_shared.Rにまとめてある
source(here("tools/validate_test2_shared.R"))

# DMのSITEIDが、facilities_dummy.csv(施設一覧)のcode列に含まれる値であることを確認する
dm %>% check_values_subset_of("SITEID", facilities[["code"]], domain_name = "DM/facilities")

names(other_domains) <- tolower(names(other_domains))

# グローバル環境に一括展開
list2env(other_domains, envir = .GlobalEnv)

# test2個別チェック
# CM
cm %>% check_date_before_today("CMENDTC", domain_name = "CM")
tmp_cm <- cm %>% filter(CMENTPT == "BASELINE")
tmp_cm %>% check_required_vars(c("CMOCCUR"), domain_name = "CM")
target_cm_cols <- c("CMTRT", "CMCAT", "CMPRESP", "CMOCCUR", "CMENRTPT")
tmp_cm <- tmp_cm %>% rename_with(~ str_c(.x, "_1"), all_of(target_cm_cols))
suffix <- "_1"
str_c(target_cm_cols, suffix) %>% walk(~ run_value_equals_checks_from_csv(tmp_cm, "CM", .x, fixed_value_checks_csv_path))
tmp_cm %>% filter(CMOCCUR_1 == "Y") %>% check_required_vars("CMENDTC")
tmp_cm %>% filter(CMOCCUR_1 != "Y") %>% check_blank_vars("CMENDTC")

# DM
dm %>% check_date_before_today("BRTHDTC", domain_name = "DM")
dm %>% check_date_after_var_before_today("RFICDTC", "BRTHDTC", domain_name = "DM")
dm %>% check_required_vars(c("RFICDTC", "BRTHDTC", "SEX", "RACE", "ETHNIC", "COUNTRY"), domain_name = "DM")
c("SEX", "RACE", "ETHNIC", "COUNTRY") %>% walk(~ run_value_equals_checks_from_csv(dm, "DM", .x, fixed_value_checks_csv_path))

# IE
ie %>% check_date_before_today("IEDTC", domain_name = "IE")
ie %>% run_ie_testcd_checks("IN01", "_1", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("IN02", "_2", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("IN03", "_3", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("IN04", "_4", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("IN05", "_5", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("IN06", "_6", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("IN07", "_7", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("IN08", "_8", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX01", "_9", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX02", "_10", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX03", "_11", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX04", "_12", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX05", "_13", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX5a", "_14", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX06", "_15", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX07", "_16", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX08", "_17", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX09", "_18", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX10", "_19", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX11", "_20", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX12", "_21", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX12a", "_22", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX13", "_23", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX14", "_24", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX14a", "_25", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX15", "_26", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX15a", "_27", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX16", "_28", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX17", "_29", fixed_value_checks_csv_path)
ie %>% run_ie_testcd_checks("EX18", "_30", fixed_value_checks_csv_path)
# MH
mh %>% check_required_vars(c("MHTERM"), domain_name = "MH")
tmp_mh <- mh %>% filter(MHCAT == "GENERAL" & MHENRTPT == "BEFORE")
tmp_mh <- tmp_mh %>% rename_with(~ str_c(.x, "_1"), c(MHENTPT))
c("MHENTPT_1") %>% walk(~ run_value_equals_checks_from_csv(tmp_mh, "MH", .x, fixed_value_checks_csv_path))
tmp_mh <- mh %>% filter(MHCAT == "GENERAL" & MHENRTPT == "ONGOING" & MHENTPT == 200)
tmp_mh %>% check_not_empty("MHCAT/MHENRTPT/MHENTPT該当行", domain_name = "MH")
tmp_mh <- mh %>% filter(MHCAT == "PRIMARY DIAGNOSIS")
tmp_mh <- tmp_mh %>% rename_with(~ str_c(.x, "_2"), c(MHTERM, MHPRESP, MHOCCUR, MHLOC, MHENRTPT, MHENTPT))
c("MHTERM_2", "MHPRESP_2", "MHOCCUR_2", "MHENRTPT_2", "MHENTPT_2") %>% walk(~ run_value_equals_checks_from_csv(tmp_mh, "MH", .x, fixed_value_checks_csv_path))
run_value_equals_checks_from_csv(filter(tmp_mh, MHLOC_2 != ""), "MH", "MHLOC_2", fixed_value_checks_csv_path)# MHLOCは必須ではない
tmp_mh <- mh %>% filter(MHCAT == "GENERAL" & MHENRTPT == "ONGOING" & MHENTPT == 100)
tmp_mh %>% check_required_vars(c("MHOCCUR"), domain_name = "MH")
tmp_mh <- tmp_mh %>% rename_with(~ str_c(.x, "_3"), c(MHTERM, MHPRESP, MHOCCUR))
c("MHTERM_3", "MHPRESP_3", "MHOCCUR_3") %>% walk(~ run_value_equals_checks_from_csv(tmp_mh, "MH", .x, fixed_value_checks_csv_path))
# MI
mi %>% check_required_vars(c("MIORRES", "MIDTC"), domain_name = "MI")
mi %>% check_date_before_today("MIDTC", domain_name = "MI")
c("MITESTCD", "MITEST", "MICAT", "MIORRES", "MIBLFL", "VISITNUM") %>% walk(~ run_value_equals_checks_from_csv(mi, "MI", .x, fixed_value_checks_csv_path))
# QS
qs %>% check_required_vars(c("QSDTC"), domain_name = "QS")
qs %>% check_date_before_today("QSDTC", domain_name = "QS")
c("QSTESTCD", "QSTEST", "QSCAT", "QSORRES", "QSBLFL", "VISITNUM") %>% walk(~ run_value_equals_checks_from_csv(qs, "QS", .x, fixed_value_checks_csv_path))
# RS
rs %>% check_required_vars(c("RSORRES", "RSDTC"), domain_name = "RS")
rs %>% check_date_before_today("RSDTC", domain_name = "RS")
tmp_rs <- rs %>% filter(RSTESTCD =="STAGE")
tmp_rs <- tmp_rs %>% rename_with(~ str_c(.x, "_1"), c(RSTEST, RSCAT, RSORRES, RSBLFL, RSEVAL, VISITNUM))
c("RSTEST_1", "RSCAT_1", "RSORRES_1", "RSBLFL_1", "RSEVAL_1", "VISITNUM_1") %>% walk(~ run_value_equals_checks_from_csv(tmp_rs, "RS", .x, fixed_value_checks_csv_path))
# TU
