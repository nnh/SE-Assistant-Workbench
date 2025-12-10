library(tidyverse)
library(jsonlite)
rm(list = ls())
input_path <- "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/ISR/Ptosh/検証/JSON/AML224-FLT3-ITD_250929_1501.json"
input_json <- jsonlite::read_json(input_path)
sheets <- input_json$sheets
forRef <- sheets %>%
    map(~ {
        sheet <- .x
        res <- .x$field_items %>% map(~ {
            res <- list(jpname = sheet$name, alias_name = sheet$alias_name, name = .x$name, label = .x$label)
            return(res)
        })
        return(res)
    }) %>%
    bind_rows()
forRef$field <- forRef$name %>% str_replace("field", "f")

for (i in seq_along((sheets))) {
    sheet <- sheets[[i]]
    for (j in seq_along(sheet$field_items)) {
        field_item <- sheet$field_items[[j]]
        if (field_item$type != "FieldItem::Article") {
            sheets[[i]]$field_items[[j]]$name <- ""
        }
    }
    sheets[[i]]$field_items <- sheets[[i]]$field_items %>% discard(~ .$name == "")
}

jpname_aliasname_fielditemnameAndOption <- sheets %>%
    map(~ {
        sheet <- .x
        nameAndOption <- .x$field_items %>% map(~ {
            res <- list(jpname = sheet$name, alias_name = sheet$alias_name, name = .x$name, label = .x$label, option = .$option, default_value = .$default_value, field_type = .$field_type)
            return(res)
        })
        return(nameAndOption)
    }) %>%
    bind_rows()
jpname_aliasname_numericality <- sheets %>%
    map(~ {
        sheet <- .x
        nameAndOption <- .x$field_items %>%
            map(~ {
                if (is.null(.$validators)) {
                    numericality <- FALSE
                } else if (is.null(.$validators$numericality)) {
                    numericality <- FALSE
                } else if (length(.$validators$numericality) == 0) {
                    numericality <- TRUE
                } else {
                    numericality <- TRUE
                }
                res <- list(jpname = sheet$name, alias_name = sheet$alias_name, name = .x$name, numericality = numericality)
                return(res)
            })
        return(nameAndOption)
    }) %>%
    bind_rows()
jpname_aliasname_normal_range_alert <- sheets %>%
    map(~ {
        sheet <- .x
        nameAndOption <- .x$field_items %>%
            map(~ {
                if (is.null(.$normal_range)) {
                    normal_range_alert <- FALSE
                } else if (is.null(.$normal_range$less_than_or_equal_to) & is.null(.$normal_range$greater_than_or_equal_to)) {
                    normal_range_alert <- FALSE
                } else {
                    normal_range_alert <- TRUE
                }
                res <- list(jpname = sheet$name, alias_name = sheet$alias_name, name = .x$name, normal_range_alert = normal_range_alert)
                return(res)
            })
        return(nameAndOption)
    }) %>%
    bind_rows()
jpname_aliasname_presence <- sheets %>%
    map(~ {
        sheet <- .x
        nameAndOption <- .x$field_items %>%
            map(~ {
                res <- list(jpname = sheet$name, alias_name = sheet$alias_name, name = .x$name, presence = .$validators$presence$validate_presence_if)
                return(res)
            }) %>%
            discard(~ is.null(.x$presence) | length(.x$presence) == 0)
        return(nameAndOption)
    }) %>%
    bind_rows()
jpname_aliasname_presence$presence_ref <- NA
for (i in 1:nrow(jpname_aliasname_presence)) {
    temp <- str_extract_all(jpname_aliasname_presence[i, "presence"], "field[0-9]+") %>%
        unlist() %>%
        unique()
    if (length(temp) == 0) {
        next
    }
    conbined_ref <- ""
    for (j in seq_along(temp)) {
        f_name <- temp[j]
        aliasName <- jpname_aliasname_presence[i, "alias_name", drop = T]
        groupName <- aliasName %>% str_remove("_[0-9]+$")
        f_ref <- forRef %>%
            filter(alias_name == aliasName) %>%
            filter(name == f_name)
        ref_str <- str_c("(", groupName, ",", f_ref$name, ",", f_ref$label, ")")
        conbined_ref <- str_c(conbined_ref, ref_str)
    }
    jpname_aliasname_presence[i, "presence_ref"] <- conbined_ref
}
jpname_aliasname_formula_if <- sheets %>%
    map(~ {
        sheet <- .x
        nameAndOption <- .x$field_items %>%
            map(~ {
                res <- list(jpname = sheet$name, alias_name = sheet$alias_name, name = .x$name, formula_if = .$validators$formula$validate_formula_if)
                return(res)
            }) %>%
            discard(~ is.null(.x$formula_if) | length(.x$formula_if) == 0)
        return(nameAndOption)
    }) %>%
    bind_rows()
jpname_aliasname_formula_if$formula_ref <- NA
for (i in 1:nrow(jpname_aliasname_formula_if)) {
    temp <- str_extract_all(jpname_aliasname_formula_if[i, "formula_if"], "f[0-9]+") %>%
        unlist() %>%
        unique()
    if (length(temp) == 0) {
        next
    }
    conbined_ref <- ""
    for (j in seq_along(temp)) {
        f_name <- temp[j]
        aliasName <- jpname_aliasname_formula_if[i, "alias_name", drop = T]
        groupName <- aliasName %>% str_remove("_[0-9]+$")
        f_ref <- forRef %>%
            filter(alias_name == aliasName) %>%
            filter(field == f_name)
        ref_str <- str_c("(", groupName, ",", f_ref$name, ",", f_ref$label, ")")
        conbined_ref <- str_c(conbined_ref, ref_str)
    }
    jpname_aliasname_formula_if[i, "formula_ref"] <- conbined_ref
}
jpname_aliasname_formula_message <- sheets %>%
    map(~ {
        sheet <- .x
        nameAndOption <- .x$field_items %>%
            map(~ {
                res <- list(jpname = sheet$name, alias_name = sheet$alias_name, name = .x$name, formula_message = .$validators$formula$validate_formula_message)
                return(res)
            }) %>%
            discard(~ is.null(.x$formula_message) | length(.x$formula_message) == 0)
        return(nameAndOption)
    }) %>%
    bind_rows()
jpname_aliasname_date_afterOrEqualTo <- sheets %>%
    map(~ {
        sheet <- .x
        nameAndOption <- .x$field_items %>%
            map(~ {
                res <- list(jpname = sheet$name, alias_name = sheet$alias_name, name = .x$name, date_afterOrEqualTo = .$validators$date$validate_date_after_or_equal_to)
                return(res)
            }) %>%
            discard(~ is.null(.x$date_afterOrEqualTo) | length(.x$date_afterOrEqualTo) == 0)
        return(nameAndOption)
    }) %>%
    bind_rows()
jpname_aliasname_date_afterOrEqualTo$after_ref <- NA
for (i in 1:nrow(jpname_aliasname_date_afterOrEqualTo)) {
    temp <- str_extract_all(jpname_aliasname_date_afterOrEqualTo[i, "date_afterOrEqualTo"], "field[0-9]+") %>%
        unlist() %>%
        unique()
    if (length(temp) == 0) {
        next
    }
    conbined_ref <- ""
    for (j in seq_along(temp)) {
        f_name <- temp[j]
        aliasName <- jpname_aliasname_date_afterOrEqualTo[i, "alias_name", drop = T]
        groupName <- aliasName %>% str_remove("_[0-9]+$")
        f_ref <- forRef %>%
            filter(alias_name == aliasName) %>%
            filter(name == f_name)
        ref_str <- str_c("(", groupName, ",", f_ref$name, ",", f_ref$label, ")")
        conbined_ref <- str_c(conbined_ref, ref_str)
    }
    jpname_aliasname_date_afterOrEqualTo[i, "after_ref"] <- conbined_ref
}
jpname_aliasname_date_beforeOrEqualTo <- sheets %>%
    map(~ {
        sheet <- .x
        nameAndOption <- .x$field_items %>%
            map(~ {
                res <- list(jpname = sheet$name, alias_name = sheet$alias_name, name = .x$name, date_beforeOrEqualTo = .$validators$date$validate_date_before_or_equal_to)
                return(res)
            }) %>%
            discard(~ is.null(.x$date_beforeOrEqualTo) | length(.x$date_beforeOrEqualTo) == 0)
        return(nameAndOption)
    }) %>%
    bind_rows()
jpname_aliasname_date_beforeOrEqualTo$before_ref <- NA
for (i in 1:nrow(jpname_aliasname_date_beforeOrEqualTo)) {
    temp <- str_extract_all(jpname_aliasname_date_beforeOrEqualTo[i, "date_beforeOrEqualTo"], "field[0-9]+") %>%
        unlist() %>%
        unique()
    if (length(temp) == 0) {
        next
    }
    conbined_ref <- ""
    for (j in seq_along(temp)) {
        f_name <- temp[j]
        aliasName <- jpname_aliasname_date_beforeOrEqualTo[i, "alias_name", drop = T]
        groupName <- aliasName %>% str_remove("_[0-9]+$")

        f_ref <- forRef %>%
            filter(alias_name == aliasName) %>%
            filter(name == f_name)
        ref_str <- str_c("(", groupName, ",", f_ref$name, ",", f_ref$label, ")")
        conbined_ref <- str_c(conbined_ref, ref_str)
    }
    jpname_aliasname_date_beforeOrEqualTo[i, "before_ref"] <- conbined_ref
}
alldata <- jpname_aliasname_fielditemnameAndOption %>%
    left_join(jpname_aliasname_presence, by = c("jpname", "alias_name", "name")) %>%
    left_join(jpname_aliasname_formula_if, by = c("jpname", "alias_name", "name")) %>%
    left_join(jpname_aliasname_formula_message, by = c("jpname", "alias_name", "name")) %>%
    left_join(jpname_aliasname_date_afterOrEqualTo, by = c("jpname", "alias_name", "name")) %>%
    left_join(jpname_aliasname_date_beforeOrEqualTo, by = c("jpname", "alias_name", "name")) %>%
    left_join(jpname_aliasname_numericality, by = c("jpname", "alias_name", "name")) %>%
    left_join(jpname_aliasname_normal_range_alert, by = c("jpname", "alias_name", "name"))

sheetNames <- alldata$alias_name %>%
    unlist() %>%
    unique()
sheetCategory <- tibble(sheetName = sheetNames)
sheetCategory$isVisit <- sheetCategory$sheetName %>% str_detect("_[0-9]+$")
sheetCategory$visitnum <- -999
sheetCategory$sheetCategory <- NA
for (i in 1:nrow(sheetCategory)) {
    if (sheetCategory[i, "isVisit", drop = T]) {
        sheetCategory[i, "visitnum"] <- sheetCategory[i, "sheetName"] %>%
            str_extract("[0-9]+$") %>%
            as.integer()
        sheetCategory[i, "sheetCategory"] <- sheetCategory[i, "sheetName"] %>% str_remove("_[0-9]+$")
    }
}
sheetCategory_del <- sheetCategory %>%
    filter(isVisit) %>%
    group_by(sheetCategory) %>%
    filter(visitnum != min(visitnum)) %>%
    ungroup()
alldata_final <- alldata %>%
    anti_join(sheetCategory_del, by = c("alias_name" = "sheetName"))
item_visit <- alldata_final %>% left_join(sheetCategory, by = c("alias_name" = "sheetName"))
item <- alldata_final %>%
    anti_join(sheetCategory %>% filter(isVisit), by = c("alias_name" = "sheetName"))
item$ftype <- NA
for (i in 1:nrow(item)) {
    if (item[i, "field_type"] != "text" & item[i, "field_type"] != "text_area") {
        next
    }
    numericality <- item[i, "numericality", drop = T]
    if (numericality) {
        item[i, "ftype"] <- "数値"
    } else {
        item[i, "ftype"] <- "テキスト"
    }
}
item$normal_range_alert <- NULL
item$numericality <- NULL
item$field_type <- NULL

item_visit <- item_visit %>% anti_join(item, by = c("jpname", "alias_name", "name", "label", "option", "default_value", "presence", "presence_ref", "formula_if", "formula_message", "formula_ref", "date_afterOrEqualTo", "after_ref", "date_beforeOrEqualTo", "before_ref"))
item_visit$ftype <- NULL
item_visit$isVisit <- NULL
item_visit$visitnum <- NULL
cols_from_replace <- c("presence", "formula_if", "formula_message", "date_afterOrEqualTo", "date_beforeOrEqualTo")
cols_to_replace <- c("presence_ref", "formula_ref", "after_ref", "before_ref")
# 他シート参照対応
for (i in 1:4) {
    from_col <- cols_from_replace[i]
    to_col <- cols_to_replace[i]
    for (row in 1:nrow(item_visit)) {
        if (is.na(item_visit[row, from_col, drop = T])) {
            next
        }
        if (str_detect(item_visit[row, from_col, drop = T], "registration")) {
            if (row == 1) {
                item_visit[row, to_col] <- "(registration,field1,同意取得日)(registration,field2,生年月日)(ie,field3,上記選択基準をすべて満たす)"
            }
            if (row == 5) {
                item_visit[row, to_col] <- "(registration,field1,同意取得日)(registration,field2,生年月日)"
            }
        }
    }
}
item_visit$ftype <- NA
for (i in 1:nrow(item_visit)) {
    normalRangeAlert <- item_visit[i, "normal_range_alert", drop = T]
    numericality <- item_visit[i, "numericality", drop = T]
    if (normalRangeAlert & numericality) {
        item_visit[i, "ftype"] <- "数値・アラート有"
    } else if (numericality) {
        item_visit[i, "ftype"] <- "数値チェック有"
    } else if (normalRangeAlert) {
        item_visit[i, "ftype"] <- "アラート設定有"
    } else {
        item_visit[i, "ftype"] <- "条件なし"
    }
}
item_visit$normal_range_alert <- NULL
item_visit$numericality <- NULL
item_visit$field_type <- NULL
item_visit$sheetCategory <- NULL

write_csv(item_visit, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_item_visit_old.csv")
write_csv(item, "/Users/mariko/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2025/20251107/AML224-FLT3-ITD_item.csv")
