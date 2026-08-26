library(tidyverse)
library(lubridate)

# 先にload_edc_spec.Rを実行してae/dm/cdisc_variable_valuesを作成しておくこと。
# 乱数で値が変わるAEドメインを、値そのものではなく「満たすべき構造的な条件」で自動チェックする
# (USUBJIDがdmの範囲内・AESTDTC<=AEENDTC・コードリスト範囲内・日付の妥当性など)。
# 目視確認と異なり、今後の修正で出方がおかしくなっていないかをそのまま再実行して確認できる

# AEドメインが満たすべき条件をチェックし、結果をtibble(check, passed, detail)で返す
validate_ae <- function(ae, dm, cdisc_variable_values) {
  results <- list()
  add_check <- function(name, passed, detail = "") {
    results[[length(results) + 1]] <<- tibble(check = name, passed = passed, detail = detail)
  }

  # DOMAIN列が全て"AE"
  add_check("domain_is_ae", all(ae[["DOMAIN"]] == "AE"), "")

  # STUDYIDが全行で同一
  add_check("studyid_consistent", length(unique(ae[["STUDYID"]])) <= 1, str_c("値: ", paste(unique(ae[["STUDYID"]]), collapse = ", ")))

  # AEにdm以外のUSUBJIDが混ざっていない(AEは被験者ごとに0件でもよいため、全USUBJIDのカバレッジは求めない)
  extra_usubjid <- setdiff(ae[["USUBJID"]], dm[["USUBJID"]])
  add_check("usubjid_subset_of_dm", length(extra_usubjid) == 0, str_c("DM以外: ", paste(extra_usubjid, collapse = ", ")))

  # AESTDTC(開始日)がAEENDTC(終了日)以前であること(同日は許容、両方値がある行のみ対象)。
  # 日付以外の時刻成分が万一残っていても影響しないよう、文字列経由でDate型に変換してから比較する
  if (all(c("AESTDTC", "AEENDTC") %in% colnames(ae))) {
    both_present <- !is.na(ae[["AESTDTC"]]) & !is.na(ae[["AEENDTC"]])
    aestdtc_date <- as.Date(as.character(ae[["AESTDTC"]]))
    aeendtc_date <- as.Date(as.character(ae[["AEENDTC"]]))
    reversed <- both_present & (aestdtc_date > aeendtc_date)
    add_check("start_before_end", !any(reversed), str_c("逆転している行数: ", sum(reversed)))
  }

  # radio_button/check_box型の列は、コードリスト(空欄含む)の範囲内の値のみを持つ。
  # check_boxは複数選択がカンマ区切りで1つの文字列になるため、カンマで分割してから判定する
  ae_choice_spec <- cdisc_variable_values %>% filter(prefix == "AE", field_type %in% c("radio_button", "check_box"))
  for (var_name in intersect(unique(ae_choice_spec[["cdisc_variable"]]), colnames(ae))) {
    # 同じcdisc_variable名が別のalias_nameでmeddra/drug等の別field_typeとしても定義されている場合、
    # 単一のコードリストでは判定できないためスキップする
    all_field_types <- cdisc_variable_values %>% filter(prefix == "AE", cdisc_variable == var_name) %>% pull(field_type) %>% unique()
    if (!all(all_field_types %in% c("radio_button", "check_box"))) {
      next
    }

    var_spec <- ae_choice_spec %>% filter(cdisc_variable == var_name)
    valid_codes <- var_spec %>%
      mutate(code = ifelse(is.na(code), default_value, code)) %>%
      pull(code) %>%
      unique() %>%
      union("")

    observed <- ae[[var_name]][!is.na(ae[[var_name]])]
    if (any(var_spec[["field_type"]] == "check_box")) {
      observed <- unique(unlist(str_split(observed, ",")))
    }
    invalid <- setdiff(unique(observed), valid_codes)

    add_check(
      str_c("valid_codes: ", var_name),
      length(invalid) == 0,
      if (length(invalid) > 0) str_c("コードリスト外の値: ", paste(invalid, collapse = ", ")) else ""
    )
  }

  # date型の列は、日付(YYYY-MM-DD)としてパースでき、未来日でない。
  # as.Date()は完全に書式が崩れた文字列(数値がそのまま文字列化されてしまった等)だとエラーで
  # 停止してしまうため、パースできない値はNAを返すlubridate::ymd()を使う
  ae_date_vars <- cdisc_variable_values %>% filter(prefix == "AE", field_type == "date") %>% pull(cdisc_variable) %>% unique()
  for (var_name in intersect(ae_date_vars, colnames(ae))) {
    raw <- ae[[var_name]]
    non_na <- raw[!is.na(raw)]
    parsed <- suppressWarnings(ymd(non_na))
    unparsable <- non_na[is.na(parsed)]
    future_dates <- parsed[!is.na(parsed) & parsed > Sys.Date()]

    add_check(
      str_c("valid_date: ", var_name),
      length(unparsable) == 0 && length(future_dates) == 0,
      str_c("パース不可: ", length(unparsable), "件(", paste(head(unparsable, 5), collapse = ", "), "), 未来日: ", length(future_dates), "件")
    )
  }

  bind_rows(results)
}

# チェック結果を表示する。1件でもFAILがあればstopでエラーにする
report_ae_validation <- function(results) {
  print(results, n = nrow(results))
  n_fail <- sum(!results[["passed"]])
  if (n_fail == 0) {
    cat("AEバリデーション: 全", nrow(results), "件PASS\n")
  } else {
    stop(str_c("AEバリデーション: ", n_fail, "件FAIL(", paste(results[["check"]][!results[["passed"]]], collapse = ", "), ")"))
  }
}
