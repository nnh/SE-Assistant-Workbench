library(here)

# 比較元(生成データ)として、先にload_edc_spec.Rを実行してae/dm/ds/other_domainsを作成しておくこと。
# その際、load_edc_spec.Rのjson_pathを下記に変更してから実行すること
# json_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/20260408大塚引継用/入力ファイル(JSON)/forTest_input_Bev-FOLFOX-SBC/Bev-FOLFOX-SBC_250929_1501.json"
# 比較に不要な中間オブジェクトが環境に残らないよう、それら以外は削除する
# (source()より前に行うこと。後だと読み込んだ関数まで削除されてしまう)
rm(list = setdiff(ls(), c("ae", "dm", "ds", "other_domains", "cdisc_variable_values", "registration_n")))

source(here("tools/validate_common.R"))
source(here("tools/validate_dm.R"))
source(here("tools/validate_ds.R"))

# 比較対象のCSVファイルを格納しているディレクトリ(直下のCSVを全て読み込む)
csv_dir <- "/Users/mariko/Library/CloudStorage/Box-Box/Stat/Trials/Chiken/NHO-Bev-FOLFOX-SBC/input/rawdata/20250715移動_要山本さん確認"

datasets <- load_csv_datasets(csv_dir)
generated_datasets <- build_generated_datasets(ae, dm, ds, other_domains)

# データセットの過不足を確認
compare_dataset_names(generated_datasets, datasets)

# 両方に共通して存在するデータセットについて、列名の差分を確認
compare_colnames(generated_datasets, datasets)

# DM/DSは目視ではなく、構造的な条件による自動チェック(validate_dm()/validate_ds())で確認する
report_dm_validation(validate_dm(dm, cdisc_variable_values, registration_n))
report_ds_validation(validate_ds(ds, dm, cdisc_variable_values))

# AEは専用のsort_colがあるため、名前で個別に指定して確認する(必須確認)
compare_special_domains(generated_datasets, datasets)

# AE/DM/DSを除いた、両方に共通して存在するドメイン名一覧。以下の1行ずつ実行するとき、
# この並び順の「何番目」かを指定する
common_names <- setdiff(intersect(names(generated_datasets), names(datasets)), special_domain_names)
common_names
common_names %>% length()

# ここから1行ずつ実行して、ドメインの中身を1つずつ目視確認する(View()が2枚(生成データ/CSV)開く)。
# 必要な数だけ行をコピーしてindexを変えて追加していく
compare_domain_by_index(generated_datasets, datasets, 1, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 2, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 3, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 4, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 5, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 6, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 7, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 8, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 9, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 10, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 11, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 12, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 13, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 14, exclude = special_domain_names)
