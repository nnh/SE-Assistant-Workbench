library(here)
rm(list = ls())
# check_value_equals(固定値チェック)用のCSV設定ファイルのパス。内容(チェックしたい固定値)は
# 試験ごとに異なるため、test_config.R(共通)ではなくここで指定する。リポジトリ外の任意の場所でよい
fixed_value_checks_csv_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2026/20260826/test3/fixed_value_checks_test3.csv"

source(here("test_config.R"))
# test_config.Rはjson_path(他テストとの切り替え用)も定義するが、このファイルは上で固定した
# json_pathを優先して使うため、test_config.R側の値で上書きしないよう再度設定し直す
json_path <- "/Users/mariko/Downloads/test20260826/fortest3_260826_1452.json"
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

# DMのSITEIDが、facilities_dummy.csv(施設一覧)のcode列に含まれる値であることを確認する
dm %>% check_values_subset_of("SITEID", facilities[["code"]], domain_name = "DM/facilities")

names(other_domains) <- tolower(names(other_domains))

# グローバル環境に一括展開
list2env(other_domains, envir = .GlobalEnv)

# test3個別チェック

# DM
c("RFICDTC", "BRTHDTC", "SEX", "RACE", "RFSTDTC") %>% check_required_vars(dm, ., domain_name = "DM")
dm %>% check_date_before_today(c("BRTHDTC"), domain_name = "DM")
dm %>% check_date_before_today(c("RFSTDTC"), domain_name = "DM")
dm %>% check_date_after_var_before_today("RFICDTC", "BRTHDTC", domain_name = "DM")
c("SEX", "RACE", "ETHNIC", "COUNTRY") %>% walk(~ run_value_equals_checks_from_csv(dm, "DM", .x, fixed_value_checks_csv_path))

# LB: LBTESTCDごとの個別チェック(test3用)。指定visitnumのレコードに絞り込み、LBTEST/LBCAT/
# extra_cols(+has_blflならLBBLFL)+VISITNUMをsuffix付き列名にリネームしたうえで固定値と
# 一致することを確認する。has_not_done_split=TRUEの場合、LBSTAT=="NOT DONE"で分岐し、
# LBORRES/LBDTCの要否(NOT DONEなら空欄、それ以外なら必須)を確認する。has_orres_in_targetなら
# LBORRESもsuffix付き列名にリネームして固定値チェック対象に含める(NOT DONE行を含む全行が対象の
# ときのみ使える)。has_not_done_split=TRUEでLBORRESにも固定値があるとき(例: CHROMO)は、
# check_orres_value_when_done=TRUEを指定するとDONE行に絞ったうえでLBORRESの固定値チェックも行う
check_lb_testcd_at_visit <- function(lb, lbtestcd, visitnum, suffix, extra_cols, fixed_value_checks_csv_path,
                                      has_blfl = TRUE, has_not_done_split = FALSE,
                                      has_orres_in_target = FALSE, check_orres_value_when_done = FALSE) {
  target_lb_cols <- c("LBTEST", "LBCAT", extra_cols, "VISITNUM")
  if (has_blfl) target_lb_cols <- c(target_lb_cols, "LBBLFL")
  if (has_orres_in_target) target_lb_cols <- c(target_lb_cols, "LBORRES")

  tmp_lb <- lb %>% filter(LBTESTCD == lbtestcd & VISITNUM == visitnum)
  tmp_lb <- tmp_lb %>% rename_with(~ str_c(.x, suffix), all_of(target_lb_cols))
  str_c(target_lb_cols, suffix) %>% walk(~ run_value_equals_checks_from_csv(tmp_lb, "LB", .x, fixed_value_checks_csv_path))

  orres_col <- if (has_orres_in_target) str_c("LBORRES", suffix) else "LBORRES"

  if (has_not_done_split) {
    tmp_lb_done <- tmp_lb %>% filter(LBSTAT != "NOT DONE")
    tmp_lb_not_done <- tmp_lb %>% filter(LBSTAT == "NOT DONE")
    c(orres_col, "LBDTC") %>% check_required_vars(tmp_lb_done, ., domain_name = "LB")
    c(orres_col, "LBDTC") %>% check_blank_vars(tmp_lb_not_done, ., domain_name = "LB")
    if (check_orres_value_when_done) {
      tmp_lb_done <- tmp_lb_done %>% rename(!!str_c("LBORRES", suffix) := LBORRES)
      str_c("LBORRES", suffix) %>% walk(~ run_value_equals_checks_from_csv(tmp_lb_done, "LB", .x, fixed_value_checks_csv_path))
    }
  } else {
    c(orres_col, "LBDTC") %>% check_required_vars(tmp_lb, ., domain_name = "LB")
  }
}

lb <- lb %>% inner_join(dm %>% select(USUBJID, BRTHDTC), by="USUBJID")
lb %>% check_date_after_var_before_today("LBDTC", "BRTHDTC", domain_name = "LB")

check_lb_testcd_at_visit(lb, "WBC", 100, "_1", c("LBORRESU", "LBSPEC"), fixed_value_checks_csv_path)
check_lb_testcd_at_visit(lb, "CA", 100, "_2", c("LBORRESU", "LBSPEC"), fixed_value_checks_csv_path, has_not_done_split = TRUE)
check_lb_testcd_at_visit(lb, "CHROMO", 100, "_3", c("LBMETHOD"), fixed_value_checks_csv_path, has_not_done_split = TRUE, check_orres_value_when_done = TRUE)
check_lb_testcd_at_visit(lb, "NUMCROSM", 100, "_4", c("LBMETHOD"), fixed_value_checks_csv_path, has_orres_in_target = TRUE)
check_lb_testcd_at_visit(lb, "DNAINDEX", 100, "_5", c("LBMETHOD"), fixed_value_checks_csv_path, has_not_done_split = TRUE)


# MH
tmp_mh <- mh %>% filter(MHCAT == "PRIMARY DIAGNOSIS")
c("MHSTDTC") %>% check_required_vars(tmp_mh, ., domain_name = "MH")
tmp_mh %>% check_date_before_today(c("MHSTDTC"), domain_name = "MH")
mh_target_cols <- c("MHTERM", "MHPRESP", "MHOCCUR")
suffix <- "_1"
tmp_mh <- tmp_mh %>% rename_with(~ str_c(.x, suffix), all_of(mh_target_cols))
str_c(mh_target_cols, suffix) %>% walk(~ run_value_equals_checks_from_csv(tmp_mh, "MH", .x, fixed_value_checks_csv_path))
