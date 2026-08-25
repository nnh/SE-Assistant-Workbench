library(here)

# 比較元(生成データ)として、先にload_edc_spec.Rを実行してae/dm/ds/other_domainsを作成しておくこと。
# 比較に不要な中間オブジェクトが環境に残らないよう、それら以外は削除する
# (source()より前に行うこと。後だと読み込んだ関数まで削除されてしまう)
rm(list = setdiff(ls(), c("ae", "dm", "ds", "other_domains")))

source(here("tools/validate_common.R"))

# 比較対象のCSVファイルを格納しているディレクトリ(直下のCSVを全て読み込む)
csv_dir <- "/Users/mariko/Library/CloudStorage/Box-Box/Stat/Trials/HMCSG/HMCSG-Tucidinostat-rrPTCL/input/rawdata"

datasets <- load_csv_datasets(csv_dir)
generated_datasets <- build_generated_datasets(ae, dm, ds, other_domains)

# AE/DM/DSは専用のsort_colがあるため、名前で個別に指定して確認する(必須確認)
compare_special_domains(generated_datasets, datasets)

# AE/DM/DSを除いた、両方に共通して存在するドメイン名一覧。以下の1行ずつ実行するとき、
# この並び順の「何番目」かを指定する
common_names <- setdiff(intersect(names(generated_datasets), names(datasets)), special_domain_names)
common_names

# ここから1行ずつ実行して、ドメインの中身を1つずつ目視確認する(View()が2枚(生成データ/CSV)開く)。
# 必要な数だけ行をコピーしてindexを変えて追加していく
compare_domain_by_index(generated_datasets, datasets, 1, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 2, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 3, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 4, exclude = special_domain_names)
compare_domain_by_index(generated_datasets, datasets, 5, exclude = special_domain_names)
