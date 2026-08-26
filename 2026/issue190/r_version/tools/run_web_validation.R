library(here)

# Web版(JS)のDM/AEドメイン生成をR版と一致しているか一括で検証する。
# validate_web_dm.R・validate_web_ae.Rを毎回別々に手動でsourceする代わりに、このファイルを
# 1回sourceすれば、load_edc_spec(json_path)の実行から両方のバリデーションまで通しで実行できる。
#
# 前提: test_config.Rのjson_path・dm_web_csv_path・ae_web_csv_pathが、
# 確認したいテストファイル1つ分の内容になっていること(Webツールで同じjson_pathを読み込んで
# 生成し、DM_dummy.csv/AE_dummy.csvをダウンロードしたもの)。
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
