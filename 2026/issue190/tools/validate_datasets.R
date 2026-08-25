library(tidyverse)

# 比較元(生成データ)として、先にload_edc_spec.Rを実行してae/dm/ds/other_domainsを作成しておくこと。
# 比較に不要な中間オブジェクトが環境に残らないよう、それら以外は削除する
rm(list = setdiff(ls(), c("ae", "dm", "ds", "other_domains")))

# 比較対象のCSVファイルを格納しているディレクトリ(直下のCSVを全て読み込む)
csv_dir <- "/Users/mariko/Library/CloudStorage/Box-Box/Stat/Trials/HMCSG/HMCSG-Tucidinostat-rrPTCL/input/rawdata"

csv_paths <- list.files(csv_dir, pattern = "\\.csv$", full.names = TRUE)

# ファイル名(拡張子なし)をキーにしたnamed list。datasets$ae のように参照できる。
# 型推定による誤判定(先頭行がT/Fに見えて後方の"NOT DONE"等がパースエラーになる、等)を避けるため、
# 全列を文字列として読み込む
datasets <- csv_paths %>%
  set_names(~ tools::file_path_sans_ext(basename(.x))) %>%
  map(~ read_csv(.x, col_types = cols(.default = "c")))

# load_edc_spec.Rで生成したae/dm/ds/other_domainsを、CSV側(datasets)と同じ
# ドメイン名(AE/DM/DS/FA等)をキーにした1つのnamed listにまとめる
generated_datasets <- c(list(AE = ae, DM = dm, DS = ds), other_domains)

# データセットの過不足を確認(片方にしか存在しないドメイン名を洗い出す)
only_in_generated <- setdiff(names(generated_datasets), names(datasets))
only_in_csv <- setdiff(names(datasets), names(generated_datasets))
cat("生成データのみに存在:", if (length(only_in_generated) > 0) paste(only_in_generated, collapse = ", ") else "(なし)", "\n")
cat("CSVのみに存在:", if (length(only_in_csv) > 0) paste(only_in_csv, collapse = ", ") else "(なし)", "\n")

# 両方に共通して存在するデータセットについて、列名のdiffを確認する
common_names <- intersect(names(generated_datasets), names(datasets))

colname_diff <- common_names %>%
  set_names() %>%
  map(function(name) {
    generated_cols <- colnames(generated_datasets[[name]])
    csv_cols <- colnames(datasets[[name]])
    list(
      only_in_generated = setdiff(generated_cols, csv_cols),
      only_in_csv = setdiff(csv_cols, generated_cols)
    )
  })

# 列名に差分があるデータセットだけを表示
colname_diff %>%
  keep(~ length(.x[["only_in_generated"]]) > 0 || length(.x[["only_in_csv"]]) > 0) %>%
  iwalk(function(diff, name) {
    cat("===", name, "===\n")
    cat("  生成データのみ:", if (length(diff[["only_in_generated"]]) > 0) paste(diff[["only_in_generated"]], collapse = ", ") else "(なし)", "\n")
    cat("  CSVのみ:", if (length(diff[["only_in_csv"]]) > 0) paste(diff[["only_in_csv"]], collapse = ", ") else "(なし)", "\n")
  })

# 中身を目視比較しやすいよう列順・行順を揃える。共通の列を先頭(CSV側の並び順)に置き、
# 片方にしか無い列は末尾に残す(削除はしない)。行順はsort_colで昇順に揃える
align_for_comparison <- function(generated_df, csv_df, sort_col) {
  common_cols <- intersect(colnames(csv_df), colnames(generated_df))
  generated_col_order <- c(common_cols, setdiff(colnames(generated_df), common_cols))
  csv_col_order <- c(common_cols, setdiff(colnames(csv_df), common_cols))
  list(
    generated = generated_df %>% select(all_of(generated_col_order)) %>% arrange(across(all_of(sort_col))),
    csv = csv_df %>% select(all_of(csv_col_order)) %>% arrange(across(all_of(sort_col)))
  )
}

# DM: USUBJIDで行を揃えて目視比較する
dm_aligned <- align_for_comparison(generated_datasets[["DM"]], datasets[["DM"]], "USUBJID")
dm_generated_aligned <- dm_aligned[["generated"]]
dm_csv_aligned <- dm_aligned[["csv"]]
if (interactive()) {
  View(dm_generated_aligned)
  View(dm_csv_aligned)
}

# AE: USUBJID内に複数レコードがあるため、USUBJID+AESEQで行を揃えて目視比較する
ae_aligned <- align_for_comparison(generated_datasets[["AE"]], datasets[["AE"]], c("USUBJID", "AESEQ"))
ae_generated_aligned <- ae_aligned[["generated"]]
ae_csv_aligned <- ae_aligned[["csv"]]
if (interactive()) {
  View(ae_generated_aligned)
  View(ae_csv_aligned)
}

# 生成データセット間の整合性チェック
# AE(AETOXGR==5、死亡)のUSUBJIDと発生日(AEENDTC。load_edc_spec.R側のbuild_death_date_table()と
# 同じ定義で、死亡に至ったAEの終了日を発生日とみなす)を、他ドメインとの突き合わせ用に保持しておく
ae_death_dates <- generated_datasets[["AE"]] %>%
  filter(AETOXGR == "5") %>%
  group_by(USUBJID) %>%
  summarise(DTHDTC = min(AEENDTC), .groups = "drop")

# DS: USUBJID内に複数レコードがあるため、USUBJID+DSSEQで行を揃えて目視比較する
ds_aligned <- align_for_comparison(generated_datasets[["DS"]], datasets[["DS"]], c("USUBJID", "DSSEQ"))
ds_generated_aligned <- ds_aligned[["generated"]]
ds_csv_aligned <- ds_aligned[["csv"]]
if (interactive()) {
  View(ds_generated_aligned)
  View(ds_csv_aligned)
}

# DS(DSTERM=="DEATH")のUSUBJIDと死亡日(DSDTC)を、他ドメインとの突き合わせ用に保持しておく
ds_death_dates <- generated_datasets[["DS"]] %>%
  filter(DSTERM == "DEATH") %>%
  select(USUBJID, DSDTC)

# AEとDSの死亡情報を突き合わせる。片方にしかUSUBJIDが無い(NA)、または両方にあっても
# 日付が一致しない行がないか、match列を見て目視確認する
death_consistency <- full_join(ae_death_dates, ds_death_dates, by = "USUBJID") %>%
  mutate(match = !is.na(DTHDTC) & !is.na(DSDTC) & DTHDTC == DSDTC) %>%
  arrange(USUBJID)
if (interactive()) {
  View(death_consistency)
}
