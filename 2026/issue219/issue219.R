rm(list = ls())

library(tidyverse)
library(jsonlite)
library(readxl)
library(testthat)

json_path <- "C:\\Users\\c0002691\\Documents\\GitHub\\ptosh-json-to-excel\\forTest_input_Ivonescimab-NSCLC\\Ivonescimab-NSCLC_261028_1626.json"
xlsx_path <- "C:\\Users\\c0002691\\Documents\\GitHub\\ptosh-json-to-excel\\output\\output_20261029141922Ivonescimab-NSCLC\\list\\Ivonescimab-NSCLC eCRF Spec 20261029.xlsx"

json_data <- read_json(json_path)

sheet_names <- excel_sheets(xlsx_path)
xlsx_data <- sheet_names %>%
  set_names() %>%
  map(~ read_excel(xlsx_path, sheet = .x))
# 列名チェック
iwalk(xlsx_data, ~ {
  print(.y)
  print(colnames(.x))
})

field_items <- json_data$sheets %>%
  keep(~ !is.null(.x$field_items) && length(.x$field_items) > 0) %>%
  map(~ list(alias_name = .x$alias_name, field_items = .x$field_items))

article_items <- field_items %>%
  map(~ list(
    alias_name = .x$alias_name,
    field_items = .x$field_items %>% keep(~ .$type == "FieldItem::Article")
  ))

assigned_items <- field_items %>%
  map(~ list(
    alias_name = .x$alias_name,
    field_items = .x$field_items %>% keep(~ .$type == "FieldItem::Assigned")
  ))

assigned_items_tbl <- json_data$sheets %>%
  map_df(~ {
    name <- .x$name
    alias_name <- .x$alias_name
    .x$field_items %>%
      keep(~ .x$type == "FieldItem::Assigned") %>%
      map_df(~ tibble(
        name = name,
        alias_name = alias_name,
        field_name = .x$name,
        label = .x$label,
        default_value = .x$default_value
      ))
  })

visit_tbl <- json_data$visits %>%
  map_dfr(~ tibble(name = .x$name, num = .x$num))

visit_group_tbl <- json_data$visit_groups %>%
  map_dfr(~ {
    name <- .x$name
    alias_name <- .x$alias_name
    .x$visit_sheets %>%
      map_dfr(~ tibble(
        name = name,
        alias_name = alias_name,
        sheet_alias_name = .x$sheet_alias_name,
        visit_num = .x$visit_num,
        reference_sheet = .x$reference_sheet
      ))
  })

visit_group_tbl <- visit_group_tbl %>%
  left_join(visit_tbl %>% rename(visit_name = name), by = c("visit_num" = "num"))

rm(visit_tbl)

visit_article_items <- article_items %>%
  keep(~ .x$alias_name %in% visit_group_tbl$sheet_alias_name)

nonvisit_article_items <- article_items %>%
  discard(~ .x$alias_name %in% visit_group_tbl$sheet_alias_name)

visit_article_items <- visit_article_items %>%
  map(~ list(
    alias_name = .x$alias_name,
    field_items = .x$field_items %>%
      map(~ list(
        label = .x$label,
        seq = .x$seq,
        validators = .x$validators,
        normal_range = .x$normal_range
      ))
  ))

normal_range_items <- visit_article_items %>%
  map(~ .x$field_items) %>%
  purrr::flatten() %>%
  keep(~ length(.x$normal_range) >= 1)

numericality_items <- visit_article_items %>%
  map(~ .x$field_items) %>%
  purrr::flatten() %>%
  keep(~ !is.null(.x$validators$numericality))

for (i in seq_along(numericality_items)) {
  target_label <- numericality_items[[i]]$label
  check <- xlsx_data$item_visit %>% filter(label == target_label)
  if (check$`数値チェック・アラート条件の有無` == "数値チェック有") {
    print(str_c("OK: ", i, " ", target_label))
  } else {
    stop(str_c("check", i, " failed: ", target_label))
  }
}

non_numericality_items <- visit_article_items %>%
  map(~ .x$field_items) %>%
  purrr::flatten() %>%
  discard(~ !is.null(.x$validators$numericality))

for (i in seq_along(non_numericality_items)) {
  target_label <- non_numericality_items[[i]]$label
  check <- xlsx_data$item_visit %>% filter(label == target_label)
  if (nrow(check) == 0 & target_label == "") {
    check <- xlsx_data$item_visit %>% filter(label %>% is.na())
  }
  if (nrow(check) == 0) {
    stop(str_c("non_check", i, ": label not found in item_visit: ", target_label))
  }
  if (check$`数値チェック・アラート条件の有無` == "条件なし") {
    print(str_c("OK: ", i, " ", target_label))
  } else {
    print(non_numericality_items[[i]])
    print(check)
    stop(str_c("non_check", i, " failed: ", target_label))
  }
}

visit_article_items_tbl <- visit_article_items %>%
  map_df(~ {
    tibble(
      alias_name = .x$alias_name,
      label = map_chr(.x$field_items, ~ .x$label %||% NA_character_),
      seq = map_int(.x$field_items, ~ .x$seq %||% NA_integer_)
    )
  })
label_counts <- visit_article_items_tbl %>%
  count(alias_name, label)

test <- label_counts$alias_name %>% unique()

CheckLabelCount <- function(test_idx, count_col) {
  check_1 <- label_counts %>%
    filter(alias_name == test[test_idx]) %>%
    arrange(label) %>%
    select(-alias_name)
  check_2 <- xlsx_data$item_visit[, c(1, count_col)]
  colnames(check_2) <- c("label", "n")
  check_2 <- check_2 %>% mutate(label = replace_na(label, ""))
  check_3 <- check_2 %>% filter(n > 0) %>% arrange(label)
  if (!isTRUE(all.equal(check_1, check_3))) {
    stop("item_visit")
  }
}

CheckLabelCount(1, 5)
CheckLabelCount(2, 6)
CheckLabelCount(3, 2)
CheckLabelCount(4, 4)
CheckLabelCount(5, 3)

# item_visitここまで

nonvisit_article_items_tbl <- nonvisit_article_items %>%
  map_df(~ {
    tibble(
      alias_name = .x$alias_name,
      name = map_chr(.x$field_items, ~ .x$name %||% NA_character_),
      label = map_chr(.x$field_items, ~ .x$label %||% NA_character_),
      seq = map_int(.x$field_items, ~ .x$seq %||% NA_integer_)
    )
  }) %>% arrange(alias_name, seq) %>% select(-seq)
check_1 <- xlsx_data$item_nonvisit %>% .[, 2:4]
colnames(check_1) <- c("alias_name", "name", "label")
check_1 <- check_1 %>% mutate(label = replace_na(label, ""))
check_1 <- check_1 %>% arrange(alias_name)
all.equal(check_1, nonvisit_article_items_tbl)

nonvisit_article_items_option_tbl <- nonvisit_article_items %>%
  map_df(~ {
    tibble(
      alias_name = .x$alias_name,
      name = map_chr(.x$field_items, ~ .x$name %||% NA_character_),
      option_name = map_chr(.x$field_items, ~ .x$option_name %||% NA_character_),
      default = map_chr(.x$field_items, ~ .x$default %||% NA_character_)
    )
  })

check_4 <- xlsx_data$item_nonvisit %>%
  select(シート名英数字別名, フィールドID, オプション名, デフォルト値)
colnames(check_4) <- c("alias_name", "name", "option_name", "default")
check_4 <- check_4 %>%
  mutate(
    option_name = replace_na(option_name, ""),
    default = replace_na(as.character(default), "")
  ) %>%
  arrange(alias_name, name)

check_5 <- nonvisit_article_items_option_tbl %>%
  mutate(
    option_name = replace_na(option_name, ""),
    default = replace_na(default, "")
  ) %>%
  arrange(alias_name, name)

if (!isTRUE(all.equal(check_4, check_5))) {
  stop("item_nonvisit option/default mismatch")
}

presence_if_tbl <- nonvisit_article_items %>%
  map_df(~ {
    alias_name <- .x$alias_name
    .x$field_items %>%
      keep(~ !is.null(.x$validators$presence$validate_presence_if) &&
             .x$validators$presence$validate_presence_if != "") %>%
      map_df(~ tibble(
        alias_name = alias_name,
        name = .x$name,
        validate_presence_if = .x$validators$presence$validate_presence_if
      ))
  }) %>% arrange(alias_name, name)
presence_if_tbl$validate_presence_if <- presence_if_tbl$validate_presence_if %>% str_trim()
test <-  c("シート名英数字別名","フィールドID", "バリデータ.必須がON.条件" )
colnames(presence_if_tbl) <- test
check_1 <- xlsx_data$item_nonvisit %>%
  select(!!test) %>%
  filter(!is.na(バリデータ.必須がON.条件)) %>%
  arrange(シート名英数字別名, フィールドID)

check_2 <- presence_if_tbl %>%
  arrange(シート名英数字別名, フィールドID)

if (!isTRUE(all.equal(check_1, check_2))) {
  stop("item_nonvisit presence_if mismatch")
}

formula_if_tbl <- nonvisit_article_items %>%
  map_df(~ {
    alias_name <- .x$alias_name
    .x$field_items %>%
      keep(~ !is.null(.x$validators$formula$validate_formula_if) &&
             .x$validators$formula$validate_formula_if != "") %>%
      map_df(~ tibble(
        alias_name = alias_name,
        name = .x$name,
        validate_formula_if = .x$validators$formula$validate_formula_if
      ))
  }) %>% arrange(alias_name, name)
formula_if_tbl$validate_formula_if <- formula_if_tbl$validate_formula_if %>% str_trim()
test <- c("シート名英数字別名", "フィールドID", "バリデータ.論理式.論理式")
colnames(formula_if_tbl) <- test
check_1 <- xlsx_data$item_nonvisit %>%
  select(!!test) %>%
  filter(!is.na(バリデータ.論理式.論理式)) %>%
  arrange(シート名英数字別名, フィールドID)

check_2 <- formula_if_tbl %>%
  arrange(シート名英数字別名, フィールドID)

if (!isTRUE(all.equal(check_1, check_2))) {
  stop("item_nonvisit formula_if mismatch")
}

formula_message_tbl <- nonvisit_article_items %>%
  map_df(~ {
    alias_name <- .x$alias_name
    .x$field_items %>%
      keep(~ !is.null(.x$validators$formula$validate_formula_message) &&
             .x$validators$formula$validate_formula_message != "") %>%
      map_df(~ tibble(
        alias_name = alias_name,
        name = .x$name,
        validate_formula_message = .x$validators$formula$validate_formula_message
      ))
  }) %>% arrange(alias_name, name)
formula_message_tbl$validate_formula_message <- formula_message_tbl$validate_formula_message %>% str_trim()
test <- c("シート名英数字別名", "フィールドID", "バリデータ.論理式.エラーメッセージ")
colnames(formula_message_tbl) <- test
check_1 <- xlsx_data$item_nonvisit %>%
  select(!!test) %>%
  filter(!is.na(バリデータ.論理式.エラーメッセージ)) %>%
  arrange(シート名英数字別名, フィールドID)

check_2 <- formula_message_tbl %>%
  arrange(シート名英数字別名, フィールドID)

if (!isTRUE(all.equal(check_1, check_2))) {
  stop("item_nonvisit formula_message mismatch")
}

date_after_tbl <- nonvisit_article_items %>%
  map_df(~ {
    alias_name <- .x$alias_name
    .x$field_items %>%
      keep(~ !is.null(.x$validators$date$validate_date_after_or_equal_to) &&
             .x$validators$date$validate_date_after_or_equal_to != "") %>%
      map_df(~ tibble(
        alias_name = alias_name,
        name = .x$name,
        validate_date_after_or_equal_to = .x$validators$date$validate_date_after_or_equal_to
      ))
  }) %>% arrange(alias_name, name)
date_after_tbl$validate_date_after_or_equal_to <- date_after_tbl$validate_date_after_or_equal_to %>% str_trim()
test <- c("シート名英数字別名", "フィールドID", "バリデータ.日付.最小値")
colnames(date_after_tbl) <- test
check_1 <- xlsx_data$item_nonvisit %>%
  select(!!test) %>%
  filter(!is.na(バリデータ.日付.最小値)) %>%
  arrange(シート名英数字別名, フィールドID)

check_2 <- date_after_tbl %>%
  arrange(シート名英数字別名, フィールドID)

if (!isTRUE(all.equal(check_1, check_2))) {
  stop("item_nonvisit date_after mismatch")
}

date_before_tbl <- nonvisit_article_items %>%
  map_df(~ {
    alias_name <- .x$alias_name
    .x$field_items %>%
      keep(~ !is.null(.x$validators$date$validate_date_before_or_equal_to) &&
             .x$validators$date$validate_date_before_or_equal_to != "") %>%
      map_df(~ tibble(
        alias_name = alias_name,
        name = .x$name,
        validate_date_before_or_equal_to = .x$validators$date$validate_date_before_or_equal_to
      ))
  }) %>% arrange(alias_name, name)
date_before_tbl$validate_date_before_or_equal_to <- date_before_tbl$validate_date_before_or_equal_to %>% str_trim()
test <- c("シート名英数字別名", "フィールドID", "バリデータ.日付.最大値")
colnames(date_before_tbl) <- test
check_1 <- xlsx_data$item_nonvisit %>%
  select(!!test) %>%
  filter(!is.na(バリデータ.日付.最大値)) %>%
  arrange(シート名英数字別名, フィールドID)

check_2 <- date_before_tbl %>%
  arrange(シート名英数字別名, フィールドID)

if (!isTRUE(all.equal(check_1, check_2))) {
  stop("item_nonvisit date_before mismatch")
}

text_numericality_items <- nonvisit_article_items %>%
  map(~ {
    alias_name <- .x$alias_name
    .x$field_items %>%
      keep(~ .x$field_type %in% c("text", "text_area")) %>%
      map(~ list(
        alias_name = alias_name,
        name = .x$name,
        numericality = .x$validators$numericality
      ))
  }) %>%
  purrr::flatten()

visit_category_sheets <- json_data$sheets %>%
  keep(~ .x$category == "visit")

visit_category_sheets_tbl <- visit_category_sheets %>%
  map_df(~ tibble(name = .x$name, alias_name = .x$alias_name))

nonvisit_category_sheets <- json_data$sheets %>%
  keep(~ .x$category != "visit")

nonvisit_category_sheets_tbl <- nonvisit_category_sheets %>%
  map_df(~ tibble(name = .x$name, alias_name = .x$alias_name))
# limitationここから

normal_range_sheets <- json_data$sheets %>%
  keep(~ any(map_lgl(.x$field_items, ~ length(.x$normal_range) >= 1))) %>%
  map(~ list(
    alias_name = .x$alias_name,
    field_items = .x$field_items %>% keep(~ length(.x$normal_range) >= 1)
  ))

numericality_sheets <- json_data$sheets %>%
  keep(~ any(map_lgl(.x$field_items, ~ length(.x$validators$numericality) >= 1))) %>%
  map(~ list(
    alias_name = .x$alias_name,
    field_items = .x$field_items %>% keep(~ length(.x$validators$numericality) >= 1)
  ))

date_sheets <- json_data$sheets %>%
  keep(~ any(map_lgl(.x$field_items, ~ length(.x$validators$date) >= 1))) %>%
  map(~ list(
    alias_name = .x$alias_name,
    field_items = .x$field_items %>% keep(~ length(.x$validators$date) >= 1)
  ))

date_sheets_tbl <- date_sheets %>%
  map_df(~ {
    alias_name <- .x$alias_name
    .x$field_items %>%
      map_df(~ tibble(
        alias_name = alias_name,
        name = .x$name,
        label = .x$label,
        validate_date_after_or_equal_to = .x$validators$date$validate_date_after_or_equal_to %||% NA_character_,
        validate_date_before_or_equal_to = .x$validators$date$validate_date_before_or_equal_to %||% NA_character_
      ))
  })
check_1 <- xlsx_data$date %>% select(-日付の最小値の参照先情報) %>% select(-日付の最大値の参照先情報) %>% select(-シート名)
colnames(check_1) <- colnames(date_sheets_tbl)

visit_group_sheets_tbl <- json_data$visit_groups %>%
  map_dfr(~ {
    name <- .x$name
    alias_name <- .x$alias_name
    .x$visit_sheets %>%
      map_dfr(~ tibble(
        g_alias_name = alias_name,
        sheet_alias_name = .x$sheet_alias_name
      ))
  })

check_2 <- date_sheets_tbl %>% left_join(visit_group_sheets_tbl, by=c("alias_name"="sheet_alias_name"))
check_2$alias_name <- ifelse(is.na(check_2$g_alias_name), check_2$alias_name, check_2$g_alias_name)
check_2 <- check_2 %>% select(alias_name, name, label,validate_date_after_or_equal_to,validate_date_before_or_equal_to)
check_1 <- check_1 %>% arrange(alias_name, name)
check_2 <- check_2 %>% arrange(alias_name, name)

if (!isTRUE(all.equal(check_1, check_2))) {
  stop("datesheet mismatch")
}

# option

option_name_items <- article_items %>%
  map(~ list(
    alias_name = .x$alias_name,
    field_items = .x$field_items %>% keep(~ !is.null(.x$option_name))
  )) %>%
  keep(~ length(.x$field_items) > 0)

option_name_items_tbl <- option_name_items %>%
  map_df(~ {
    alias_name <- .x$alias_name
    .x$field_items %>%
      map_df(~ tibble(
        alias_name = alias_name,
#        name = .x$name,
#        label = .x$label,
        option_name = .x$option_name
      ))
  }) %>% distinct()

options_tbl <- json_data$options %>%
  map_df(~ {
    name <- .x$name
    .x$values %>%
      map_df(~ tibble(
        name = name,
        value_name = .x$name,
        seq = .x$seq,
        code = .x$code,
        is_usable = .x$is_usable
      ))
  })
check_1 <- xlsx_data$option
check_2 <- option_name_items_tbl %>% inner_join(options_tbl, by=c("option_name"="name"),relationship = "many-to-many")
check_2 <- check_2 %>% left_join(visit_group_sheets_tbl, by=c("alias_name"="sheet_alias_name"))
check_2$alias_name <- ifelse(is.na(check_2$g_alias_name), check_2$alias_name, check_2$g_alias_name)
check_2 <- check_2 %>% filter(is_usable)
check_2 <- check_2 %>% select(-g_alias_name)
test <- visit_group_tbl %>% select(name, alias_name)
check_3 <- check_2 %>% inner_join(test, by="alias_name")
check_4 <- check_2 %>% inner_join(nonvisit_category_sheets_tbl, by="alias_name")
check_5 <- check_3 %>% bind_rows(check_4) %>% select(name, alias_name, option_name, value_name, seq, code, is_usable)
colnames(check_5) <- colnames(check_1)
check_1 <- check_1 %>% arrange(シート名英数字別名, オプションの表示順)
check_5 <- check_5 %>% arrange(シート名英数字別名, オプションの表示順)

if (!isTRUE(all.equal(check_1, check_5))) {
  stop("optionsheet mismatch")
}
# name
sheet_orders <- json_data$sheet_orders

sheet_orders_tbl <- sheet_orders %>%
  map_df(~ tibble(seq = .x$seq, alias_name = .x$sheet))

sheets_images_count_tbl <- json_data$sheets %>%
  map_df(~ tibble(alias_name = .x$alias_name, name = .x$name, images_count = .x$images_count))

check_2 <- xlsx_data$name 
check_1 <- sheets_images_count_tbl %>% inner_join(sheet_orders_tbl, by="alias_name") %>% select(name, alias_name, images_count)
colnames(check_1) <- colnames(check_2)
if (!isTRUE(all.equal(check_1, check_2))) {
  stop("namesheet mismatch")
}
# master

link_type_sheets <- json_data$sheets %>%
  keep(~ any(map_lgl(.x$field_items, ~ length(.x$link_type) >= 1))) %>%
  map(~ list(
    name = .x$name,
    alias_name = .x$alias_name,
    field_items = .x$field_items %>%
      keep(~ length(.x$link_type) >= 1) %>%
      map(~ list(
        name = .x$name,
        label = .x$label,
        seq = .x$seq,
        link_type = .x$link_type
      ))
  ))

link_type_tbl <- link_type_sheets %>%
  map_df(~ {
    alias_name <- .x$alias_name
    .x$field_items %>%
      map_df(~ tibble(
        alias_name = alias_name,
        name = .x$name,
        label = .x$label,
        seq = .x$seq,
        link_type = .x$link_type
      ))
  }) %>% filter(link_type != "") %>% arrange(seq) %>% select(-seq)

check_1 <- xlsx_data$master %>% select(-シート名)
check_2 <- link_type_tbl
colnames(check_2) <- colnames(check_1)
if (!isTRUE(all.equal(check_1, check_2))) {
  stop("mastersheet mismatch")
}

# assigned
check_1 <- assigned_items_tbl %>% left_join(visit_group_sheets_tbl, by=c("alias_name"="sheet_alias_name"))
check_1$alias_name <- ifelse(is.na(check_1$g_alias_name), check_1$alias_name, check_1$g_alias_name)
check_1 <- check_1 %>% select(-g_alias_name)
check_2 <- xlsx_data$assigned
colnames(check_1) <- colnames(check_2)
check_1 <- check_1 %>% arrange(シート名英数字別名, フィールドID) %>% select(-シート名)
check_1$ラベル <- check_1$ラベル %>% str_trim()
check_2 <- check_2 %>% arrange(シート名英数字別名, フィールドID) %>% select(-シート名)
if (!isTRUE(all.equal(check_1, check_2))) {
  print(waldo::compare(check_1, check_2))
  stop("assignsheet mismatch")
}

