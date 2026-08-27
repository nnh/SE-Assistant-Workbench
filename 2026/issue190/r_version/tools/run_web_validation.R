library(here)

# Web版(JS)のDM/AE/DS/other_domainsドメイン生成をR版と一致しているか一括で検証する。
# validate_web_dm.R・validate_web_ae.R・validate_web_ds.R・validate_web_other_domains.Rを
# 毎回別々に手動でsourceする代わりに、このファイルを1回sourceすれば、load_edc_spec(json_path)の
# 実行から全てのバリデーションまで通しで実行できる。
#
# 前提: test_config.Rのjson_path・dm_web_csv_path・ae_web_csv_path・ds_web_csv_path・
# other_domains_web_csv_dirが、確認したいテストファイル1つ分の内容になっていること(Webツールで
# 同じjson_pathを読み込んで生成し、dummy_data.zipをダウンロード・展開したもの。
# other_domains_web_csv_dirはその展開先フォルダを指す)。
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

cat("\n========== other_domains ==========\n")
source(here("tools/validate_web_other_domains.R"))
