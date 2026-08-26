library(here)

# Web版(JS)のDM/AE/DSドメイン生成をR版と一致しているか一括で検証する。
# validate_web_dm.R・validate_web_ae.R・validate_web_ds.Rを毎回別々に手動でsourceする代わりに、
# このファイルを1回sourceすれば、load_edc_spec(json_path)の実行から全てのバリデーションまで
# 通しで実行できる。
#
# 前提: test_config.Rのjson_path・dm_web_csv_path・ae_web_csv_path・ds_web_csv_pathが、
# 確認したいテストファイル1つ分の内容になっていること(Webツールで同じjson_pathを読み込んで
# 生成し、dummy_data.zipをダウンロード・展開したもの)。
# 別のテストファイルを確認したい場合は、test_config.Rを書き換え、Web側も再生成・再ダウンロード
# してから、このファイルをもう一度sourceする(=4ファイル分確認したい場合は計4回実行する)
rm(list = ls())

source(here("test_config.R"))
source(here("load_edc_spec.R"))
load_edc_spec(json_path)

cat("========== DMドメイン ==========\n")
source(here("tools/validate_web_dm.R"))

cat("\n========== AEドメイン ==========\n")
source(here("tools/validate_web_ae.R"))

cat("\n========== DSドメイン ==========\n")
source(here("tools/validate_web_ds.R"))
