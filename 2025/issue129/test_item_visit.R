library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)
source("test_getvisitgroups.r")
visit_groups <- GetVisitGroups(input_json)

# "item_visit",
sheets <- input_json$sheets
for (sheet_number in seq_along(sheets)) {
    sheet <- sheets[[sheet_number]]
    sheets[[sheet_number]]$field_items <- sheets[[sheet_number]]$field_items %>% keep(~ .x$type == "FieldItem::Article")
    aliasName <- sheet$alias_name
    visit_group <- visit_groups %>%
        filter(alias_name == aliasName) %>%
        pull(jpname) %>%
        unique()
    sheets[[sheet_number]]$visit_group <- visit_group
}
sheets <- sheets %>% keep(~ .x$category == "visit")
target <- sheets %>%
    map(~ {
        sheet <- .x
        alias_name <- sheet$visit_group
        field_items <- sheet$field_items %>% map(~ {
            return(list(alias_name = alias_name, name = .x$name, label = .x$label, varidators_numericality = .x$validators$numericality, normal_range_greater_than_or_equal_to = .x$normal_range$greater_than_or_equal_to, normal_range_less_than_or_equal_to = .x$normal_range$less_than_or_equal_to))
        })
        return(field_items)
    })

for (sheet_number in seq_along(target)) {
    sheet <- target[[sheet_number]]
    for (field_item_number in seq_along(sheet)) {
        field_item <- sheet[[field_item_number]]
        if (!is.null(field_item$varidators_numericality)) {
            num_f <- TRUE
        } else {
            num_f <- FALSE
        }
        if (!is.null(field_item$normal_range_greater_than_or_equal_to) || !is.null(field_item$normal_range_less_than_or_equal_to)) {
            nr_ge <- purrr::pluck(field_item, "normal_range_greater_than_or_equal_to", .default = "")
            nr_le <- purrr::pluck(field_item, "normal_range_less_than_or_equal_to", .default = "")

            if (nr_ge != "" | nr_le != "") {
                normal_range_f <- TRUE
            } else {
                normal_range_f <- FALSE
            }
        } else {
            normal_range_f <- FALSE
        }
        if (num_f == TRUE || normal_range_f == TRUE) {
            flag <- "数値・アラート有"
        }
        if (num_f == TRUE && normal_range_f == FALSE) {
            flag <- "数値チェック有"
        }
        if (num_f == FALSE && normal_range_f == TRUE) {
            flag <- "アラート設定有"
        }
        if (num_f == FALSE && normal_range_f == FALSE) {
            flag <- "条件なし"
        }
        target[[sheet_number]][[field_item_number]]$flag <- flag
        target[[sheet_number]][[field_item_number]]$varidators_numericality <- NULL
        target[[sheet_number]][[field_item_number]]$normal_range_greater_than_or_equal_to <- NULL
        target[[sheet_number]][[field_item_number]]$normal_range_less_than_or_equal_to <- NULL
    }
}
target_tbl <- target %>%
    map(~ bind_rows(.x)) %>%
    bind_rows() %>%
    select(alias_name, name, label, flag) %>%
    distinct()

count_tbl <- target_tbl %>%
    count(alias_name, label, name = "count")
item_visit_result <- count_tbl %>%
    left_join(target_tbl, by = c("alias_name", "label")) %>%
    select(alias_name, label, count, flag) %>%
    distinct() %>%
    arrange(alias_name, label)
write_csv(item_visit_result, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_item_visit.csv")


# test <- sheets %>% keep(~ .x$alias_name == "consoli1_800")
# test2 <- test[[1]]$field_items %>% keep(~ .x$label == "投与量 (g/m2/day)")
# test3 <- test2
# for (i in seq_along(test2)) {
#     test3[[i]]$name <- NULL
#     test3[[i]]$seq <- NULL
# }
