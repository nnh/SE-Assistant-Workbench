library(here)

# 比較元(生成データ)として、先にload_edc_spec.Rを実行してae/dm/ds/other_domainsを作成しておくこと。
# その際、load_edc_spec.Rのjson_pathを下記に変更してから実行すること
# json_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2026/20260826/test1/json/fortest1_260826_1112.json"
# 比較に不要な中間オブジェクトが環境に残らないよう、それら以外は削除する
# (source()より前に行うこと。後だと読み込んだ関数まで削除されてしまう)
rm(list = setdiff(ls(), c("ae", "dm", "ds", "other_domains", "cdisc_variable_values", "registration_n", "json_path")))

source(here("tools/validate_common.R"))

# CM: SPDEVID=="1"(field70)は無条件必須。SPDEVID=="2"〜"5"(field239/248/257/266)は
# SCORRES(field22, SC/baseline/003)の閾値でゲーティングされ、SPDEVIDが大きいほど閾値が厳しい。
# SCORRES自体の値は、other_domains$SCのSCTESTCD=="PLOTNUM"の行(field22に対応)から取得できるため、
# それを使って各SPDEVIDのゲーティングが正確に条件通りか(値がある/NAが期待通りか)を直接確認する。
# other_domainsはこのスクリプトのトップレベルで定義済みの変数をそのまま参照する(クロージャ)
check_cm_cmtrt <- function(data, dm, cdisc_variable_values) {
  results <- list()
  add_check <- function(name, passed, detail = "") {
    results[[length(results) + 1]] <<- tibble(check = name, passed = passed, detail = detail)
  }

  # SPDEVID=="1"は無条件必須
  unconditional <- data %>% filter(SPDEVID == "1")
  missing_unconditional <- unconditional %>% filter(is.na(CMTRT)) %>% pull(USUBJID)
  add_check(
    "cmtrt_unconditional_required (SPDEVID==1)",
    length(missing_unconditional) == 0,
    str_c("CMTRTが空: ", paste(missing_unconditional, collapse = ", "))
  )

  # SCORRES(field22相当)をSCTESTCD=="PLOTNUM"から取得
  scorres <- other_domains[["SC"]] %>% filter(SCTESTCD == "PLOTNUM") %>% select(USUBJID, SCORRES)

  # 各SPDEVIDの元のvalidator(validate_presence_if)と対応する期待閾値
  thresholds <- list(
    "2" = c("2", "3", "4", "5<="),
    "3" = c("3", "4", "5<="),
    "4" = c("4", "5<="),
    "5" = c("5<=")
  )

  for (spdevid in names(thresholds)) {
    target <- data %>% filter(SPDEVID == spdevid) %>% left_join(scorres, by = "USUBJID")
    expected_present <- target[["SCORRES"]] %in% thresholds[[spdevid]]
    actual_present <- !is.na(target[["CMTRT"]])
    mismatch_usubjid <- target[["USUBJID"]][expected_present != actual_present]
    add_check(
      str_c("cmtrt_gating (SPDEVID==", spdevid, ")"),
      length(mismatch_usubjid) == 0,
      str_c("不一致: ", paste(mismatch_usubjid, collapse = ", "))
    )
  }

  final <- bind_rows(results)
  if (all(final[["passed"]])) {
    cat("CM CMTRTチェック: 問題なし(", nrow(final), "件PASS)\n")
  } else {
    cat("CM CMTRTチェック:", sum(!final[["passed"]]), "件NG\n")
  }
  final
}

# TR: 同じUSUBJIDであればTRDTC(腫瘍評価日)とTUDTC(腫瘍同定日)が一致するはずであることを確認する。
# other_domainsはこのスクリプトのトップレベルで定義済みの変数をそのまま参照する(クロージャ)
check_tr_tu_dtc <- function(data, dm, cdisc_variable_values) {
  results <- list()
  add_check <- function(name, passed, detail = "") {
    results[[length(results) + 1]] <<- tibble(check = name, passed = passed, detail = detail)
  }

  tu_dtc <- other_domains[["TU"]] %>% distinct(USUBJID, TUDTC)
  tr_dtc <- data %>% distinct(USUBJID, TRDTC)

  mismatch_usubjid <- tr_dtc %>%
    inner_join(tu_dtc, by = "USUBJID") %>%
    filter(TRDTC != TUDTC) %>%
    pull(USUBJID) %>%
    unique()

  add_check(
    "trdtc_matches_tudtc (同一USUBJID)",
    length(mismatch_usubjid) == 0,
    str_c("不一致: ", paste(mismatch_usubjid, collapse = ", "))
  )

  final <- bind_rows(results)
  if (all(final[["passed"]])) {
    cat("TR/TU DTCチェック: 問題なし(", nrow(final), "件PASS)\n")
  } else {
    cat("TR/TU DTCチェック:", sum(!final[["passed"]]), "件NG\n")
  }
  final
}

# other_domainsのうち、この試験で特に確認したいprefixがあれば、ここにprefix -> チェック関数を追加する
other_domains_special_checks <- list(CM = check_cm_cmtrt, TR = check_tr_tu_dtc)

# 比較対象のCSVファイルを格納しているディレクトリ(直下のCSVを全て読み込む)。
# json_pathのファイル名ごとにcsv_dir_by_file(tools/validate_common.R)で管理する
csv_dir <- csv_dir_by_file[[basename(json_path)]]

validation <- run_full_validation(ae, dm, ds, other_domains, cdisc_variable_values, registration_n, csv_dir, other_domains_special_checks)

# AE/DM/DSを除いた、両方に共通して存在するドメイン名一覧。以下の1行ずつ実行するとき、
# この並び順の「何番目」かを指定する
generated_datasets <- validation[["generated_datasets"]]
datasets <- validation[["datasets"]]
common_names <- setdiff(intersect(names(generated_datasets), names(datasets)), special_domain_names)
common_names
common_names %>% length()

# ここから1行ずつ実行して、ドメインの中身を1つずつ目視確認する(View()が2枚(生成データ/CSV)開く)。
# 必要な数だけ行をコピーしてindexを変えて追加していく
# compare_domain_by_index(generated_datasets, datasets, 1, exclude = special_domain_names)
# compare_domain_by_index(generated_datasets, datasets, 13, exclude = special_domain_names)
