library(tidyverse)

# 専用のsort_colで個別に確認するため、index指定の対象から除くドメイン名
special_domain_names <- c("AE", "DM", "DS")

# csv_dir直下のCSVを全て読み込む。ファイル名(拡張子なし)をキーにしたnamed listを返す(datasets$AE のように参照できる)。
# 型推定による誤判定(先頭行がT/Fに見えて後方の"NOT DONE"等がパースエラーになる、等)を避けるため、
# 全列を文字列として読み込む。na=character(0)を指定し、空欄も文字列"NA"も自動でRのNAに
# 変換しない(コードリストの選択肢として文字列"NA"が使われているケースがあるため、
# 空欄と文字列"NA"を区別したまま読み込む)
load_csv_datasets <- function(csv_dir) {
  csv_paths <- list.files(csv_dir, pattern = "\\.csv$", full.names = TRUE)
  csv_paths %>%
    set_names(~ tools::file_path_sans_ext(basename(.x))) %>%
    map(~ read_csv(.x, col_types = cols(.default = "c"), na = character(0)))
}

# load_edc_spec.Rで生成したae/dm/ds/other_domainsを、CSV側(datasets)と同じ
# ドメイン名(AE/DM/DS/FA等)をキーにした1つのnamed listにまとめる
build_generated_datasets <- function(ae, dm, ds, other_domains) {
  c(list(AE = ae, DM = dm, DS = ds), other_domains)
}

# データセットの過不足を確認(片方にしか存在しないドメイン名を洗い出して表示する)
compare_dataset_names <- function(generated_datasets, datasets) {
  only_in_generated <- setdiff(names(generated_datasets), names(datasets))
  only_in_csv <- setdiff(names(datasets), names(generated_datasets))
  cat("生成データのみに存在:", if (length(only_in_generated) > 0) paste(only_in_generated, collapse = ", ") else "(なし)", "\n")
  cat("CSVのみに存在:", if (length(only_in_csv) > 0) paste(only_in_csv, collapse = ", ") else "(なし)", "\n")
  invisible(list(only_in_generated = only_in_generated, only_in_csv = only_in_csv))
}

# 両方に共通して存在するデータセットについて、列名の差分があるものだけを表示する
compare_colnames <- function(generated_datasets, datasets) {
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

  diff_only <- colname_diff %>%
    keep(~ length(.x[["only_in_generated"]]) > 0 || length(.x[["only_in_csv"]]) > 0)

  if (length(diff_only) == 0) {
    cat("列名の差分: なし\n")
  } else {
    diff_only %>%
      iwalk(function(diff, name) {
        cat("===", name, "===\n")
        cat("  生成データのみ:", if (length(diff[["only_in_generated"]]) > 0) paste(diff[["only_in_generated"]], collapse = ", ") else "(なし)", "\n")
        cat("  CSVのみ:", if (length(diff[["only_in_csv"]]) > 0) paste(diff[["only_in_csv"]], collapse = ", ") else "(なし)", "\n")
      })
  }

  invisible(colname_diff)
}

# 中身を目視比較しやすいよう列順・行順を揃える。共通の列を先頭(CSV側の並び順)に置き、
# 片方にしか無い列は末尾に残す(削除はしない)。行順はsort_colで昇順に揃える。
# 生成データ側のNAとCSV側の空欄("")は同じ「値が無い」状態とみなし、比較上の見た目の差にならないよう
# どちらも""に統一する(生成データ側はDate等の列も混ざるため、一旦全列を文字列にしてから揃える)
align_for_comparison <- function(generated_df, csv_df, sort_col) {
  common_cols <- intersect(colnames(csv_df), colnames(generated_df))
  generated_col_order <- c(common_cols, setdiff(colnames(generated_df), common_cols))
  csv_col_order <- c(common_cols, setdiff(colnames(csv_df), common_cols))
  list(
    generated = generated_df %>% select(all_of(generated_col_order)) %>% arrange(across(all_of(sort_col))) %>%
      mutate(across(everything(), ~ replace_na(as.character(.x), ""))),
    csv = csv_df %>% select(all_of(csv_col_order)) %>% arrange(across(all_of(sort_col))) %>%
      mutate(across(everything(), ~ replace_na(as.character(.x), "")))
  )
}

# domain_name(例: "DM")について、generated_datasets/datasets双方をalign_for_comparison()で揃え、
# interactiveセッションであればView()で開く。返り値はlist(generated=, csv=)
compare_domain <- function(generated_datasets, datasets, domain_name, sort_col, view = interactive()) {
  aligned <- align_for_comparison(generated_datasets[[domain_name]], datasets[[domain_name]], sort_col)
  if (view) {
    View(aligned[["generated"]], title = str_c(domain_name, "_generated"))
    View(aligned[["csv"]], title = str_c(domain_name, "_csv"))
  }
  aligned
}

# 両方に共通して存在するドメイン名一覧(common_names)のうち、index番目のドメインを比較する。
# 1行ずつ実行してドメインを1つずつ目視確認していく用途で、domain_nameを直接指定する代わりに
# 「何番目か」で指定できるようにしたもの。sort_colは指定が無ければ、{domain_name}SEQ列があれば
# USUBJID+{domain_name}SEQ、無ければUSUBJIDのみを使う。
# exclude(例: AE/DM/DSは専用のsort_colで別途名前指定するため除外したい場合)を指定すると、
# common_names作成時にそのドメイン名を除いてから番号を振る
compare_domain_by_index <- function(generated_datasets, datasets, index, sort_col = NULL, exclude = character(0), view = interactive()) {
  common_names <- setdiff(intersect(names(generated_datasets), names(datasets)), exclude)
  domain_name <- common_names[index]
  if (is.null(sort_col)) {
    seq_col <- str_c(domain_name, "SEQ")
    sort_col <- if (seq_col %in% colnames(generated_datasets[[domain_name]])) c("USUBJID", seq_col) else "USUBJID"
  }
  cat("[", index, "/", length(common_names), "]", domain_name, "\n")
  compare_domain(generated_datasets, datasets, domain_name, sort_col, view = view)
}

# AE/DM/DSは専用のsort_colがあるため、名前で個別に指定して確認する(必須確認)。
# 返り値はlist(DM=, AE=, DS=)、各要素はcompare_domain()の返り値(list(generated=, csv=))
compare_special_domains <- function(generated_datasets, datasets, view = interactive()) {
  list(
    DM = compare_domain(generated_datasets, datasets, "DM", "USUBJID", view = view),
    AE = compare_domain(generated_datasets, datasets, "AE", c("USUBJID", "AESEQ"), view = view),
    DS = compare_domain(generated_datasets, datasets, "DS", c("USUBJID", "DSSEQ"), view = view)
  )
}

# AE(AETOXGR==5、死亡)のUSUBJIDと発生日(AEENDTC。死亡に至ったAEの終了日を発生日とみなす)を返す
build_ae_death_dates <- function(ae) {
  ae %>%
    filter(AETOXGR == "5") %>%
    group_by(USUBJID) %>%
    summarise(DTHDTC = min(AEENDTC), .groups = "drop")
}

# DS(DSTERM=="DEATH")のUSUBJIDと死亡日(DSDTC)を返す
build_ds_death_dates <- function(ds) {
  ds %>%
    filter(DSTERM == "DEATH") %>%
    select(USUBJID, DSDTC)
}

# AEとDSの死亡情報を突き合わせる。片方にしかUSUBJIDが無い(NA)、または両方にあっても
# 日付が一致しない行がないか、match列を見て目視確認できるようにする
check_death_consistency <- function(ae_death_dates, ds_death_dates) {
  full_join(ae_death_dates, ds_death_dates, by = "USUBJID") %>%
    mutate(match = !is.na(DTHDTC) & !is.na(DSDTC) & DTHDTC == DSDTC) %>%
    arrange(USUBJID)
}

# load_edc_spec.Rで生成したae/dm/ds/other_domainsと、csv_dir直下のCSVを一括で比較する。
# データセットの過不足確認、列名diff、DM/AE/DSの中身の目視比較(View)、AE/DSの死亡情報の
# 整合性チェックまでをまとめて実行し、生成した各オブジェクトをlistで返す
run_domain_validation <- function(ae, dm, ds, other_domains, csv_dir, view = interactive()) {
  datasets <- load_csv_datasets(csv_dir)
  generated_datasets <- build_generated_datasets(ae, dm, ds, other_domains)

  compare_dataset_names(generated_datasets, datasets)
  compare_colnames(generated_datasets, datasets)

  special <- compare_special_domains(generated_datasets, datasets, view = view)
  dm_aligned <- special[["DM"]]
  ae_aligned <- special[["AE"]]
  ds_aligned <- special[["DS"]]

  ae_death_dates <- build_ae_death_dates(ae)
  ds_death_dates <- build_ds_death_dates(ds)
  death_consistency <- check_death_consistency(ae_death_dates, ds_death_dates)
  if (view) {
    View(death_consistency, title = "death_consistency")
  }

  list(
    datasets = datasets,
    generated_datasets = generated_datasets,
    dm_aligned = dm_aligned,
    ae_aligned = ae_aligned,
    ds_aligned = ds_aligned,
    ae_death_dates = ae_death_dates,
    ds_death_dates = ds_death_dates,
    death_consistency = death_consistency
  )
}
