library(here)

# validate_datasets_test1.Rと同じ処理(check_cm_cmtrt/check_tr_tu_dtc等の特別チェック・
# run_full_validationの呼び出し方まで含め)を行うが、比較元(生成データ)をR版のその場生成ではなく、
# Webツールが生成したCSV(dummy_data.zip展開後)に差し替えたもの。
#
# 事前準備: test_config.R の json_path をfortest1用に、dm_web_csv_path・ae_web_csv_path・
# ds_web_csv_path・other_domains_web_csv_dirを、Webツールで同じJSONを読み込んで生成し
# 「ZIPで一括ダウンロード」したdummy_data.zipの展開先に設定しておくこと
rm(list = ls())

source(here("test_config.R"))
source(here("tools/validate_common.R"))

# cdisc_variable_values・registration_nはEDC仕様(JSON)由来で被験者データには依存しないため、
# R側でload_edc_spec()を実行して取得する(このとき同時に生成されるR版のae/dm/ds/other_domains・
# discontinuation_dateは、このあと全てWeb版CSVの内容で上書きするため使わない)
source(here("load_edc_spec.R"))
load_edc_spec(json_path)

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
other_domains <- other_domains[setdiff(names(other_domains), c("DM", "AE", "DS"))]
registration_n <- nrow(dm)
# discontinuation_dateは被験者ごとの中止日という「その乱数シードでの生成結果」に依存する値のため、
# Web版自身のdsから作り直す(R版のdiscontinuation_dateをそのまま使うと、対応するUSUBJIDの
# 中止日が互いに無関係な値になり誤検知するため)
discontinuation_date <- build_discontinuation_date_table(ds)

# 比較に不要な中間オブジェクトが環境に残らないよう、それら以外は削除する
# (source()より前に行うこと。後だと読み込んだ関数まで削除されてしまう)
rm(list = setdiff(ls(), c("ae", "dm", "ds", "other_domains", "cdisc_variable_values", "registration_n", "json_path", "discontinuation_date")))

source(here("tools/validate_common.R"))

# ここから下はvalidate_datasets_test1.Rと共通の処理(CM/TR特別チェック・run_full_validation
# 呼び出し・ドメイン名一覧の確認)。validate_test1_shared.Rにまとめてある
source(here("tools/validate_test1_shared.R"))

# 値必須・空欄・日付チェックで繰り返し参照するドメインを短い変数名に控えておく(タイプ量を減らすため)。
# cmはgrDevicesパッケージの関数名と同じだが、ここで代入することでローカル変数が優先される(shadow)
# だけなので問題ない
cm <- generated_datasets[["CM"]]
ds <- generated_datasets[["DS"]]
ec <- generated_datasets[["EC"]]
fa <- generated_datasets[["FA"]]
lb <- generated_datasets[["LB"]]
mh <- generated_datasets[["MH"]]
pe <- generated_datasets[["PE"]]
pr <- generated_datasets[["PR"]]
qs <- generated_datasets[["QS"]]
rs <- generated_datasets[["RS"]]
sc <- generated_datasets[["SC"]]
tr <- generated_datasets[["TR"]]

# DMのBRTHDTC/RFSTDTCが今日以前・RFICDTCがBRTHDTC以降今日以前であることを確認する(tools/validate_common.R)
check_date_before_today(dm, "BRTHDTC", domain_name = "DM")
check_date_before_today(dm, "RFSTDTC", domain_name = "DM")
check_date_after_var_before_today(dm, "RFICDTC", "BRTHDTC", domain_name = "DM")
fa %>% filter(FAOBJ == "Tumor Involvement") %>% check_numeric_range("FAORRES", min_value = 0, max_value = 99, domain_name = "FA")
lb %>% filter(LBTESTCD == "PBTCCE") %>% check_numeric_range("LBORRES", min_value = 0, max_value = 100, domain_name = "LB")
lb %>% filter(LBTESTCD == "HGB") %>% check_numeric_range("LBORRES", max_value = 30, domain_name = "LB")
lb %>% filter(LBTESTCD == "HCT") %>% check_numeric_range("LBORRES", min_value = 0, max_value = 99, domain_name = "LB")
lb %>% filter(LBTESTCD == "PLAT") %>% check_numeric_range("LBORRES", max_value = 999, domain_name = "LB")
lb %>% filter(LBTESTCD == "PLOT") %>% check_numeric_range("LBORRES", min_value = 0, max_value = 99, domain_name = "LB")
lb %>% filter(LBTESTCD == "ALB") %>% check_numeric_range("LBORRES", max_value = 99, domain_name = "LB")
lb %>% filter(LBTESTCD == "BILI") %>% check_numeric_range("LBORRES", max_value = 99, domain_name = "LB")
lb %>% filter(LBTESTCD == "AST") %>% check_numeric_range("LBORRES", max_value = 9999, domain_name = "LB")
lb %>% filter(LBTESTCD == "ALT") %>% check_numeric_range("LBORRES", max_value = 9999, domain_name = "LB")
lb %>% filter(LBTESTCD == "LDH") %>% check_numeric_range("LBORRES", max_value = 9999, domain_name = "LB")
lb %>% filter(LBTESTCD == "ALP") %>% check_numeric_range("LBORRES", max_value = 9999, domain_name = "LB")
lb %>% filter(LBTESTCD == "GGT") %>% check_numeric_range("LBORRES", max_value = 9999, domain_name = "LB")
lb %>% filter(LBTESTCD == "UREAN") %>% check_numeric_range("LBORRES", max_value = 99, domain_name = "LB")
lb %>% filter(LBTESTCD == "CREAT") %>% check_numeric_range("LBORRES", max_value = 99, domain_name = "LB")
lb %>% filter(LBTESTCD == "SODIUM") %>% check_numeric_range("LBORRES", max_value = 999, domain_name = "LB")
lb %>% filter(LBTESTCD == "K") %>% check_numeric_range("LBORRES", max_value = 10, domain_name = "LB")
lb %>% filter(LBTESTCD == "CL") %>% check_numeric_range("LBORRES", max_value = 999, domain_name = "LB")
lb %>% filter(LBTESTCD == "CA") %>% check_numeric_range("LBORRES", max_value = 999, domain_name = "LB")
lb %>% filter(LBTESTCD == "PHOS") %>% check_numeric_range("LBORRES", max_value = 999, domain_name = "LB")
lb %>% filter(LBTESTCD == "CRP") %>% check_numeric_range("LBORRES", max_value = 99, domain_name = "LB")
lb %>% filter(LBTESTCD == "IL2SR") %>% check_numeric_range("LBORRES", max_value = 99999, domain_name = "LB")
lb %>% filter(LBTESTCD == "FIBRINO") %>% check_numeric_range("LBORRES", max_value = 9999, domain_name = "LB")

cm %>% check_date_before_today("CMSTDTC", domain_name = "CM")
ds %>% check_date_before_today("DSSTDTC", domain_name = "DS")
ds %>% check_date_after_var_before_today("DSDTC", "DSSTDTC", domain_name = "DS")
ec %>% check_date_before_today("ECSTDTC", domain_name = "CM")
lb %>% check_date_before_today("LBDTC", domain_name = "LB")
mh %>% check_date_before_today("MHDTC", domain_name = "MH")
pe %>% check_date_before_today("PEDTC", domain_name = "PE")
pr %>% check_date_before_today("PRSTDTC", domain_name = "PR")
qs %>% check_date_before_today("QSDTC", domain_name = "QS")
rs %>% check_date_before_today("RSDTC", domain_name = "RS")
sc %>% check_date_before_today("SCDTC", domain_name = "SC")
tr %>% check_date_before_today("TRDTC", domain_name = "TR")

# FA(FABLFL=="Y"、baseline評価)のFAOBJ==faobjについて、FASTATに応じたFAORRESの必須/空欄を確認する。
# FASTAT==""(実施済み)ならFAORRESは必須、FASTAT=="NOT DONE"(未実施)ならFAORRESは空欄のはず
check_fa_baseline_orres <- function(fa, faobj) {
  label <- str_c("FA(", faobj, ")")
  fa %>% filter(FABLFL == "Y", FAOBJ == faobj, FASTAT == "") %>% check_required_vars("FAORRES", domain_name = label)
  fa %>% filter(FABLFL == "Y", FAOBJ == faobj, FASTAT == "NOT DONE") %>% check_blank_vars("FAORRES", domain_name = label)
}

# LB(LBTESTCD==lbtestcd)について、LBSTATに応じたLBORRESの必須/空欄を確認する。
# LBSTAT==""(実施済み)ならLBORRESは必須、LBSTAT=="NOT DONE"(未実施)ならLBORRESは空欄のはず
check_lb_status_orres <- function(lb, lbtestcd) {
  label <- str_c("LB(", lbtestcd, ")")
  lb %>% filter(LBTESTCD == lbtestcd, LBSTAT == "") %>% check_required_vars("LBORRES", domain_name = label)
  lb %>% filter(LBTESTCD == lbtestcd, LBSTAT == "NOT DONE") %>% check_blank_vars("LBORRES", domain_name = label)
}

# CM/RS/MH(SPDEVID==spdevid)について、prior_line_therapy(SC/PLOTNUM)のSCORRESがspdevid以上
# (thresholds[[spdevid]]に該当するUSUBJID。check_cm_cmtrtのthresholdsと同じ考え方)なら
# CMTRT/CMSTDTC・RSORRES/RSDTCが必須、それ以外は空欄のはずであることを確認する。
# MHOCCURは、それに加えてそのSPDEVIDのRS応答がCR/PRの被験者だけ必須(それ以外は空欄のはず)
check_prior_line_therapy_gating <- function(spdevid, cm, rs, mh, prior_line_therapy_by_scorres) {
  thresholds <- list(
    "2" = c("2", "3", "4", "5<="),
    "3" = c("3", "4", "5<="),
    "4" = c("4", "5<="),
    "5" = c("5<=")
  )
  target_usubjid <- bind_rows(prior_line_therapy_by_scorres[thresholds[[as.character(spdevid)]]])

  cm %>% filter(SPDEVID == spdevid) %>% inner_join(target_usubjid, by = "USUBJID") %>%
    check_required_vars(c("CMTRT", "CMSTDTC"), domain_name = "CM")
  rs %>% filter(SPDEVID == spdevid) %>% inner_join(target_usubjid, by = "USUBJID") %>%
    check_required_vars(c("RSORRES", "RSDTC"), domain_name = "RS")
  cm %>% filter(SPDEVID == spdevid) %>% anti_join(target_usubjid, by = "USUBJID") %>%
    check_blank_vars(c("CMTRT", "CMSTDTC"), domain_name = "CM")
  rs %>% filter(SPDEVID == spdevid) %>% anti_join(target_usubjid, by = "USUBJID") %>%
    check_blank_vars(c("RSORRES", "RSDTC"), domain_name = "RS")

  rs_cr_pr_usubjid <- rs %>% filter(SPDEVID == spdevid, RSORRES %in% c("CR", "PR")) %>% select(USUBJID)
  target_usubjid_mh <- target_usubjid %>% inner_join(rs_cr_pr_usubjid, by = "USUBJID")
  mh %>% filter(SPDEVID == spdevid) %>% inner_join(target_usubjid_mh, by = "USUBJID") %>%
    check_required_vars("MHOCCUR", domain_name = "MH")
  mh %>% filter(SPDEVID == spdevid) %>% anti_join(target_usubjid_mh, by = "USUBJID") %>%
    check_blank_vars("MHOCCUR", domain_name = "MH")
}

# 値必須チェック
cm %>% filter(SPDEVID == 1) %>% check_required_vars(c("CMTRT", "CMSTDTC"), domain_name = "CM")
prior_line_therapy <- sc %>% filter(SCTESTCD == "PLOTNUM")
prior_line_therapy_by_scorres <- prior_line_therapy$SCORRES %>%
  unique() %>%
  set_names() %>%
  map(~ prior_line_therapy %>% filter(SCORRES == .x) %>% select(USUBJID))

check_prior_line_therapy_gating(2, cm, rs, mh, prior_line_therapy_by_scorres)
check_prior_line_therapy_gating(3, cm, rs, mh, prior_line_therapy_by_scorres)
check_prior_line_therapy_gating(4, cm, rs, mh, prior_line_therapy_by_scorres)
check_prior_line_therapy_gating(5, cm, rs, mh, prior_line_therapy_by_scorres)

dm %>% check_required_vars(c("RFICDTC", "BRTHDTC", "SEX", "RACE", "RFSTDTC"), domain_name = "DM")
fa %>% filter(FABLFL == "Y" & FAOBJ == "Bulky Mass") %>% check_required_vars("FAORRES", domain_name = "FA")
fa %>% filter(FABLFL == "Y" & FAOBJ == "Tumor Involvement") %>% check_required_vars("FAORRES", domain_name = "FA")
check_fa_baseline_orres(fa, "Bone Marrow Infiltration")
lb %>% filter(LBTESTCD == "WBC") %>% check_required_vars("LBORRES", domain_name = "LB")
lb %>% filter(LBTESTCD == "NEUT") %>% check_required_vars("LBORRES", domain_name = "LB")
lb %>% filter(LBTESTCD == "PLAT") %>% check_required_vars("LBORRES", domain_name = "LB")
lb %>% filter(LBTESTCD == "BILI") %>% check_required_vars("LBORRES", domain_name = "LB")
lb %>% filter(LBTESTCD == "AST") %>% check_required_vars("LBORRES", domain_name = "LB")
lb %>% filter(LBTESTCD == "ALT") %>% check_required_vars("LBORRES", domain_name = "LB")
lb %>% filter(LBTESTCD == "CREAT") %>% check_required_vars("LBORRES", domain_name = "LB")
check_lb_status_orres(lb, "LYM")
check_lb_status_orres(lb, "PBTCCE")
check_lb_status_orres(lb, "RBC")
check_lb_status_orres(lb, "HGB")
check_lb_status_orres(lb, "HCT")
check_lb_status_orres(lb, "PROT")
check_lb_status_orres(lb, "ALB")
check_lb_status_orres(lb, "LDH")
check_lb_status_orres(lb, "ALP")
check_lb_status_orres(lb, "GGT")
check_lb_status_orres(lb, "UREAN")
check_lb_status_orres(lb, "SODIUM")
check_lb_status_orres(lb, "K")
check_lb_status_orres(lb, "CL")
check_lb_status_orres(lb, "CA")
check_lb_status_orres(lb, "PHOS")
check_lb_status_orres(lb, "CRP")
check_lb_status_orres(lb, "IL2SR")
check_lb_status_orres(lb, "B2MICG")
check_lb_status_orres(lb, "INR")
check_lb_status_orres(lb, "APTT")
check_lb_status_orres(lb, "DDIMER")
check_lb_status_orres(lb, "FIBRINO")
check_lb_status_orres(lb, "FDP")
mh %>% filter(MHENTPT == 100) %>% check_required_vars(c("MHTERM", "MHDTC"), domain_name = "MH")
# MHOCCUR
rs_spdevid_1_cr_pr <- rs %>% filter(SPDEVID == 1 & (RSORRES == "CR" | RSORRES == "PR")) %>% select(USUBJID)
rs_spdevid_1_others <- rs %>% filter(SPDEVID == 1 & (RSORRES != "CR" & RSORRES != "PR")) %>% select(USUBJID)
mh_spdevid_1 <- mh %>%  filter(SPDEVID == 1)
mh %>% filter(SPDEVID == 1) %>% inner_join(rs_spdevid_1_cr_pr, by="USUBJID") %>% check_required_vars("MHOCCUR", domain_name = "MH")
mh %>% filter(SPDEVID == 1) %>% inner_join(rs_spdevid_1_others, by="USUBJID") %>% check_blank_vars("MHOCCUR", domain_name = "MH")
pe %>% check_required_vars("PEORRES", domain_name = "PE")
pe %>% filter(PEORRES != "U") %>% check_required_vars("PEDTC", domain_name = "PE")
qs %>% check_required_vars(c("QSORRES", "QSDTC"), domain_name = "QS")
rs %>% filter(SPDEVID == 1) %>% check_required_vars(c("RSORRES", "RSDTC"), domain_name = "RS")
sc %>% check_required_vars("SCORRES", domain_name = "SC")
sc %>% filter(SCTESTCD == "STAGE" & SCORRES != "UNKNOWN") %>% check_required_vars("SCDTC", domain_name = "SC")
tr %>% check_required_vars(c("TRORRES", "TRDTC"), domain_name = "TR")
pr %>% filter(PRCAT == "Autologous") %>% check_required_vars("PROCCUR", domain_name = "PR")
pr %>% filter(PRCAT == "Autologous" & PROCCUR == "Y") %>% check_required_vars("PRSTDTC", domain_name = "PR")
pr %>% filter(PRCAT == "Allogeneic") %>% check_required_vars("PROCCUR", domain_name = "PR")
pr %>% filter(PRCAT == "Allogeneic" & PROCCUR == "Y") %>% check_required_vars("PRSTDTC", domain_name = "PR")
ec %>% check_required_vars("ECSTDTC", domain_name = "EC")
fa %>% filter(FAOBJ != "Bone Marrow Infiltration" & VISITNUM != 100) %>% check_required_vars("FAORRES", domain_name = "FA")
rs %>% filter(RSENTPT != 100 | (RSENTPT == 100 & SPDEVID == 1)) %>% check_required_vars(c("RSORRES", "RSDTC"), domain_name = "RS")
# ここから1行ずつ実行して、ドメインの中身を1つずつ目視確認する(View()が2枚(生成データ/CSV)開く)。
# 必要な数だけ行をコピーしてindexを変えて追加していく
compare_domain(generated_datasets, datasets, "DM", "USUBJID")
compare_domain(generated_datasets, datasets, "AE", c("USUBJID", "AESEQ"))
compare_domain(generated_datasets, datasets, "DS", c("USUBJID", "DSSEQ"))
compare_domain_by_index(generated_datasets, datasets, 1, exclude = special_domain_names)
# compare_domain_by_index(generated_datasets, datasets, 13, exclude = special_domain_names)
