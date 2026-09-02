library(here)

# validate_datasets_test2.Rと同じ処理(check_cm_baseline1/check_tr_tu_dtc等の特別チェック・
# run_full_validationの呼び出し方まで含め)を行うが、比較元(生成データ)をR版のその場生成ではなく、
# Webツールが生成したCSV(dummy_data.zip展開後)に差し替えたもの。
#
# 事前準備: test_config.R の json_path をfortest2用に、dm_web_csv_path・ae_web_csv_path・
# ds_web_csv_path・other_domains_web_csv_dirを、Webツールで同じJSONを読み込んで生成し
# 「ZIPで一括ダウンロード」したdummy_data.zipの展開先に設定しておくこと
rm(list = ls())

# check_value_equals(固定値チェック)用のCSV設定ファイルのパス。内容(チェックしたい固定値)は
# 試験ごとに異なるため、test_config.R(共通)ではなくここで指定する。リポジトリ外の任意の場所でよい
fixed_value_checks_csv_path <- "/Users/mariko/Downloads/fixed_value_checks_test2.csv"

source(here("test_config.R"))
source(here("tools/validate_common.R"))

# cdisc_variable_values・registration_n・who_drug_idfはEDC仕様(JSON)/辞書由来で被験者データには
# 依存しないため、R側でload_edc_spec()を実行して取得する(このとき同時に生成されるR版の
# ae/dm/ds/other_domains・discontinuation_dateは、このあと全てWeb版CSVの内容で上書きするため使わない)
source(here("load_edc_spec.R"))
load_edc_spec(json_path)

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
rm(list = setdiff(ls(), c("ae", "dm", "ds", "other_domains", "cdisc_variable_values", "registration_n", "who_drug_idf", "json_path", "discontinuation_date", "fixed_value_checks_csv_path")))

source(here("tools/validate_common.R"))

# ここから下はvalidate_datasets_test2.Rと共通の処理(CM/TR特別チェック・run_full_validation
# 呼び出し・ドメイン名一覧の確認)。validate_test2_shared.Rにまとめてある
source(here("tools/validate_test2_shared.R"))

# 固定値チェック(fixed_value_checks_csv_pathのdomain/var(/visit)行と一致するか確認)。
# 例: qs %>% run_value_equals_checks_from_csv("QS", "QSORRES", fixed_value_checks_csv_path)
#     qs %>% run_value_equals_checks_from_csv("QS", "QSORRES", fixed_value_checks_csv_path, visit = "Cycle1Day1")
