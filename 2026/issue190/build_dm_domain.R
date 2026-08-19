library(tidyverse)
library(here)

source(here("constant.R"))
source(here("generate_brthdtc.R"))
source(here("generate_random_date.R"))

build_dm_domain <- function(n = 100) {
  dm <- tibble(
    SITEID = sample(dummy_site$SITEID, n, replace = TRUE),
    SUBJID = str_pad(1:n, width = 4, pad = "0")
  )
  dm[["STUDYID"]] <- "dummy-studyid"
  dm[["DOMAIN"]] <- "DM"
  dm[["USUBJID"]] <- str_c(dm[["STUDYID"]], dm[["SUBJID"]], sep = "-")
  dm <- generate_brthdtc(dm, var_name = "BRTHDTC")
  dm[["alias_name"]] <- "registration"

  dm %>% select(STUDYID, DOMAIN, USUBJID, SUBJID, SITEID, BRTHDTC, alias_name)
}

populate_dm_domain <- function(dm, cdisc_variable_values, registration_start_date) {
  tmp_dm_colnames <- colnames(dm)
  tmp_dm <- cdisc_variable_values %>% filter(prefix == "DM")
  dm_options <- tmp_dm %>% filter(field_type == "radio_button")
  dm_options[["code"]] <- ifelse(is.na(dm_options[["code"]]), dm_options[["default_value"]], dm_options[["code"]])
  dm_options_variables <- dm_options$cdisc_variable %>% unique()
  dm_options_target_vars <- setdiff(dm_options_variables, tmp_dm_colnames)
  dm_input_data <- tmp_dm %>% filter(field_type != "radio_button")
  dm_input_data_variables <- dm_input_data$cdisc_variable %>% unique()
  dm_input_data_target_vars <- setdiff(dm_input_data_variables, tmp_dm_colnames)

  for (i in seq_along(dm_input_data_target_vars)) {
    var_name <- dm_input_data_target_vars[i]
    print(var_name)
    dm <- generate_random_date(dm, registration_start_date, Sys.Date(), var_name)
  }
  for (i in seq_along(dm_options_target_vars)) {
    var_name <- dm_options_target_vars[i]
    print(var_name)

    # 選択肢となるコード値を取得（重複を除外）
    choices <- dm_options %>%
      filter(cdisc_variable == var_name) %>%
      pull(code) %>%
      unique()

    # コード値が存在する場合のみ、dm の行数分だけランダムに割り振る
    if (length(choices) > 0) {
      dm[[var_name]] <- sample(choices, size = nrow(dm), replace = TRUE)
    }
  }

  dm
}
