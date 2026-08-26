library(here)

# 比較元(生成データ)として、先にload_edc_spec.Rを実行してae/dm/ds/other_domainsを作成しておくこと。
# その際、load_edc_spec.Rのjson_pathを下記に変更してから実行すること
# json_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2026/20260826/test2/json/fortest2_260826_1501.json"
# 比較に不要な中間オブジェクトが環境に残らないよう、それら以外は削除する
# (source()より前に行うこと。後だと読み込んだ関数まで削除されてしまう)
rm(list = setdiff(ls(), c("ae", "dm", "ds", "other_domains", "cdisc_variable_values", "registration_n", "who_drug_idf")))

source(here("tools/validate_common.R"))

# CM: CMSPID=="baseline1"のブロックについて、CMOCCURとCMENDTC/CMSTDTCの関係を確認する
# (1) CMOCCUR=="Y"ならCMENDTCに値がある
# (2) CMOCCUR=="N"ならCMENDTCは空白
# (3) CMOCCURの値に関わらずCMSTDTCは常に空白(baseline1はCMSTDTCを定義していないため)
check_cm_baseline1 <- function(data, dm, cdisc_variable_values) {
  results <- list()
  add_check <- function(name, passed, detail = "") {
    results[[length(results) + 1]] <<- tibble(check = name, passed = passed, detail = detail)
  }

  baseline1 <- data %>% filter(CMSPID == "baseline1")

  missing_endtc_y <- baseline1 %>% filter(CMOCCUR == "Y", is.na(CMENDTC)) %>% pull(USUBJID)
  add_check(
    "cmendtc_present_when_occur_Y",
    length(missing_endtc_y) == 0,
    str_c("CMENDTCが空: ", paste(missing_endtc_y, collapse = ", "))
  )

  present_endtc_n <- baseline1 %>% filter(CMOCCUR == "N", !is.na(CMENDTC)) %>% pull(USUBJID)
  add_check(
    "cmendtc_blank_when_occur_N",
    length(present_endtc_n) == 0,
    str_c("CMENDTCに値あり: ", paste(present_endtc_n, collapse = ", "))
  )

  present_stdtc <- baseline1 %>% filter(!is.na(CMSTDTC)) %>% pull(USUBJID)
  add_check(
    "cmstdtc_always_blank",
    length(present_stdtc) == 0,
    str_c("CMSTDTCに値あり: ", paste(present_stdtc, collapse = ", "))
  )

  # CMSPIDが"concomitant_drug_other"で始まる場合はCMDECODが空白、
  # "concomitant_drug"で始まり"other"を含まない場合はCMDECODが空白でないはず
  concomitant_drug_other <- data %>% filter(str_starts(CMSPID, "concomitant_drug_other"))
  present_decod_other <- concomitant_drug_other %>% filter(!is.na(CMDECOD)) %>% pull(USUBJID)
  add_check(
    "cmdecod_blank_for_concomitant_drug_other",
    length(present_decod_other) == 0,
    str_c("CMDECODに値あり: ", paste(present_decod_other, collapse = ", "))
  )

  # WHO Drug/IDF側にgeneric_name_enが1件も無い薬剤(カテゴリ名など)は、CMDECODが空になるのが
  # 正しい挙動のため、判定対象から除く。who_drug_idfはこのスクリプトのトップレベルで
  # 定義済みの変数をそのまま参照する(クロージャ)
  has_generic_name <- who_drug_idf %>% filter(!is.na(generic_name_en)) %>% pull(full_name_en) %>% unique()

  concomitant_drug_main <- data %>%
    filter(str_starts(CMSPID, "concomitant_drug"), !str_detect(CMSPID, "other"), CMTRT %in% has_generic_name)
  missing_decod_main <- concomitant_drug_main %>% filter(is.na(CMDECOD)) %>% pull(USUBJID)
  add_check(
    "cmdecod_present_for_concomitant_drug",
    length(missing_decod_main) == 0,
    str_c("CMDECODが空: ", paste(missing_decod_main, collapse = ", "))
  )

  final <- bind_rows(results)
  if (all(final[["passed"]])) {
    cat("CM baseline1チェック: 問題なし(", nrow(final), "件PASS)\n")
  } else {
    cat("CM baseline1チェック:", sum(!final[["passed"]]), "件NG\n")
  }
  final
}

# TR: 同一USUBJID・LNKID(病変を紐づけるID、TULNKID<->TRLNKID)・VISITNUM(同じ訪問)であれば、
# TRDTC(腫瘍評価日)とTUDTC(腫瘍同定日)が一致するはずであることを確認する。
# TUは病変の同定(baseline)を1回だけ記録し、TRはその後の複数回のフォローアップ評価を含むため、
# 単純にUSUBJIDだけで突き合わせると別訪問同士を比較してしまい、日付が異なって当然のケースを
# 誤検知してしまう。LNKID・VISITNUMも含めて突き合わせることで、同じ訪問の記録同士だけを比較する。
# other_domainsはこのスクリプトのトップレベルで定義済みの変数をそのまま参照する(クロージャ)
check_tr_tu_dtc <- function(data, dm, cdisc_variable_values) {
  results <- list()
  add_check <- function(name, passed, detail = "") {
    results[[length(results) + 1]] <<- tibble(check = name, passed = passed, detail = detail)
  }

  tu_dtc <- other_domains[["TU"]] %>% distinct(USUBJID, TULNKID, VISITNUM, TUDTC)
  tr_dtc <- data %>% distinct(USUBJID, TRLNKID, VISITNUM, TRDTC)

  mismatch <- tr_dtc %>%
    inner_join(tu_dtc, by = c("USUBJID", "TRLNKID" = "TULNKID", "VISITNUM")) %>%
    filter(TRDTC != TUDTC)

  add_check(
    "trdtc_matches_tudtc (同一USUBJID・LNKID・VISITNUM)",
    nrow(mismatch) == 0,
    str_c("不一致: ", nrow(mismatch), "件(USUBJID: ", paste(unique(mismatch[["USUBJID"]]), collapse = ", "), ")")
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
other_domains_special_checks <- list(CM = check_cm_baseline1, TR = check_tr_tu_dtc)

# 比較対象のCSVファイルを格納しているディレクトリ(直下のCSVを全て読み込む)
csv_dir <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2026/20260826/test2/rawdata"

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
#compare_domain_by_index(generated_datasets, datasets, 1, exclude = special_domain_names)
