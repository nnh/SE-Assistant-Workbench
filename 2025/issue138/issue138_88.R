rm(list = ls())
library(jsonlite)
source("C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\SE-Assistant-Workbench\\2025\\issue138\\issue138_common.R")
input_json_list <- list()
input_json_list[[1]] <- read_json("C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\ptosh-json-to-excel\\forTest_input_AML224-FLT3-ITD\\AML224-FLT3-ITD_250929_1501.json")
i <- 1
for (i in 1:length(target_trials)) {
    input_json <- input_json_list[[i]]
    folder_path <- file.path(
        "C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\ptosh-json-to-excel\\output",
        target_folders[[target_trials[i]]],
        "list"
    )
    excel_file <- list.files(folder_path, pattern = "\\.xlsx$", full.names = TRUE) %>% .[[1]]
    sheet_orders <- input_json$sheet_orders %>%
        map(~ c(seq = .x$seq, sheet = .x$sheet)) %>%
        bind_rows() %>%
        arrange(as.numeric(seq))
    sheet_orders$sheet_seq <- as.numeric(sheet_orders$seq)
    sheet_orders <- sheet_orders %>%
        select(sheet, sheet_seq)
    field_item_orders <- input_json$sheets %>%
        map(~ {
            aliasName <- .x$alias_name
            fieldItems <- .x$field_items %>%
                map(~ c(seq = .x$seq, name = .x$name)) %>%
                bind_rows() # %>%
            # arrange(as.numeric(seq))
            if (nrow(fieldItems) == 0) {
                return(tibble())
            }
            fieldItems$aliasname <- aliasName
            fieldItems$field_seq <- fieldItems$seq %>% as.numeric()
            fieldItems <- fieldItems %>%
                select(aliasname, name, field_seq) %>%
                arrange(field_seq)
            return(fieldItems)
        }) %>%
        bind_rows()
    sheet_field_item_orders <- sheet_orders %>%
        inner_join(field_item_orders, by = c("sheet" = "aliasname")) %>%
        arrange(sheet_seq, field_seq)
    visit_groups <- input_json$visit_groups %>%
        map(~ {
            aliasName <- .x$alias_name
            res <- .x$visit_sheets %>%
                map(~ tibble(
                    aliasname = aliasName,
                    sheet_aliasname = .x$sheet_alias_name,
                    visitnum = .x$visit_num %>% as.numeric()
                )) %>%
                bind_rows() %>%
                arrange(as.numeric(visitnum))
        }) %>%
        bind_rows()
    #####################################################
    # assigned
    assigned <- excel_file %>%
        readxl::read_excel(sheet = "assigned") %>%
        select(シート名英数字別名, フィールドID)
    output_assigned <- input_json$sheets %>%
        map(~ {
            aliasName <- .x$alias_name
            fieldItems <- .x$field_items %>%
                keep(~ .x$type == "FieldItem::Assigned")
            if (length(fieldItems) == 0) {
                return(tibble())
            }
            res <- fieldItems %>%
                map(~ tibble(
                    aliasname = aliasName,
                    name = .x$name,
                    seq = .x$seq,
                    default_value = .x$default_value
                )) %>%
                bind_rows()
            return(res)
        }) %>%
        bind_rows()
    output_assigned <- output_assigned %>%
        inner_join(sheet_orders, by = c("aliasname" = "sheet"))
    output_assigned <- output_assigned %>%
        left_join(visit_groups, by = c("aliasname" = "sheet_aliasname"))
    output_assigned$aliasname <- ifelse(is.na(output_assigned$aliasname.y), output_assigned$aliasname, output_assigned$aliasname.y)
    output_assigned <- output_assigned %>%
        arrange(sheet_seq, seq) %>%
        select(aliasname, name) %>%
        distinct()
    colnames(output_assigned) <- colnames(assigned)
    if (!identical(output_assigned, assigned)) {
        str(assigned)
        str(output_assigned)
        stop("issue 88 NG")
    }
    #####################################################
    # master
    master <- excel_file %>%
        readxl::read_excel(sheet = "master") %>%
        select(シート名英数字別名, フィールドID)
    output_master <- input_json$sheets %>%
        map(~ {
            aliasName <- .x$alias_name
            fieldItems <- .x$field_items %>% keep(~ !is.null(.x$link_type))
            if (length(fieldItems) == 0) {
                return(tibble())
            }
            res <- fieldItems %>%
                map(~ tibble(
                    aliasname = aliasName,
                    name = .x$name,
                    seq = .x$seq,
                    link_type = .x$link_type
                )) %>%
                bind_rows()
            return(res)
        }) %>%
        bind_rows() %>%
        filter(link_type != "")
    output_master <- output_master %>%
        inner_join(sheet_orders, by = c("aliasname" = "sheet")) %>%
        arrange(sheet_seq, seq) %>%
        select(aliasname, name) %>%
        distinct()
    colnames(output_master) <- colnames(master)
    if (!identical(output_master, master)) {
        str(master)
        str(output_master)
        stop("issue 88 NG")
    }
    #####################################################
    # name
    name <- excel_file %>%
        readxl::read_excel(sheet = "name") %>%
        select(シート名英数字別名)
    output_name <- input_json$sheet_orders %>%
        map(~ tibble(
            シート名英数字別名 = .x$sheet, seq = .x$seq %>% as.numeric()
        )) %>%
        bind_rows() %>%
        arrange(seq) %>%
        select(-seq)
    if (!identical(output_name, name)) {
        str(name)
        str(output_name)
        stop("issue 88 NG")
    }
    #####################################################
    # option
    option <- excel_file %>%
        readxl::read_excel(sheet = "option") %>%
        select(シート名英数字別名, オプション名) %>%
        distinct()
    temp <- input_json$sheets
    sheetidxes <- rev(seq_along(temp))
    for (sheet_idx in sheetidxes) {
        fieldItemIdxes <- rev(seq_along(temp[[sheet_idx]]$field_items))
        for (fielditem_idx in fieldItemIdxes) {
            if (temp[[sheet_idx]]$field_items[[fielditem_idx]]$type != "FieldItem::Article") {
                temp[[sheet_idx]]$field_items[[fielditem_idx]] <- NULL
                next
            }
            if (is.null(temp[[sheet_idx]]$field_items[[fielditem_idx]]$option_name)) {
                temp[[sheet_idx]]$field_items[[fielditem_idx]] <- NULL
            }
        }
    }
    temp2 <- temp %>%
        map(~ {
            aliasName <- .x$alias_name

            fieldItems <- .x$field_items %>%
                map(~ tibble(
                    aliasname = aliasName,
                    name = .x$name,
                    seq = .x$seq,
                    option_name = .x$option_name
                ))
            if (length(fieldItems) == 0) {
                return(tibble())
            }
            return(fieldItems %>% bind_rows())
        }) %>%
        bind_rows()
    output_option <- temp2 %>%
        inner_join(sheet_orders, by = c("aliasname" = "sheet")) %>%
        arrange(sheet_seq, seq)
    output_option <- output_option %>%
        left_join(visit_groups, by = c("aliasname" = "sheet_aliasname"))
    output_option$aliasname <- ifelse(is.na(output_option$aliasname.y), output_option$aliasname, output_option$aliasname.y)
    output_option <- output_option %>%
        arrange(sheet_seq, seq) %>%
        select(aliasname, option_name) %>%
        distinct()
    colnames(output_option) <- colnames(option)
    if (!identical(output_option, option)) {
        str(option)
        str(output_option)
        stop("issue 88 NG")
    }
    #####################################################
    # date
    date <- excel_file %>%
        readxl::read_excel(sheet = "date") %>%
        select(シート名英数字別名, フィールドID)
    temp <- input_json$sheets
    validators <- temp %>%
        map(~ {
            res <- .x$field_items %>%
                keep(~ length(.x$validators$date) > 0)
            if (length(res) == 0) {
                return(list())
            }
            res$alias_name <- .x$alias_name
            return(res)
        }) %>%
        discard(~ length(.) == 0)
    df_validators <- validators %>%
        map(~ {
            aliasName <- .x$alias_name
            target <- .x %>%
                discard(names(.) == "alias_name")
            res <- target %>%
                map(~ tibble(
                    aliasname = aliasName,
                    name = .x$name,
                    seq = .x$seq,
                    validator_date_before = .x$validators$date$validate_date_before_or_equal_to,
                    validator_date_after = .x$validators$date$validate_date_after_or_equal_to
                )) %>%
                bind_rows()
            return(res)
        }) %>%
        bind_rows() %>%
        filter(validator_date_before != "" | validator_date_after != "")
    output_date <- df_validators %>%
        inner_join(sheet_orders, by = c("aliasname" = "sheet")) %>%
        arrange(sheet_seq, seq)
    output_date_visit <- output_date %>%
        left_join(visit_groups, by = c("aliasname" = "sheet_aliasname"))
    output_date_visit$aliasname <- ifelse(is.na(output_date_visit$aliasname.y), output_date_visit$aliasname, output_date_visit$aliasname.y)
    output_date_visit <- output_date_visit %>%
        arrange(sheet_seq, seq) %>%
        select(aliasname, name) %>%
        distinct()
    colnames(output_date_visit) <- colnames(date)
    if (!identical(output_date_visit, date)) {
        str(date)
        str(output_date_visit)
        stop("issue 88 NG")
    }
    #####################################################
    # limitation
    limitation <- excel_file %>%
        readxl::read_excel(sheet = "limitation") %>%
        select(シート名英数字別名, フィールドID)
    temp <- input_json$sheets
    normal_range <- temp %>%
        map(~ {
            res <- .x$field_items %>%
                keep(~ length(.x$normal_range) > 0)
            if (length(res) == 0) {
                return(list())
            }
            res$alias_name <- .x$alias_name
            return(res)
        }) %>%
        discard(~ length(.) == 0)
    validators <- temp %>%
        map(~ {
            res <- .x$field_items %>%
                keep(~ length(.x$validators$numericality) > 0)
            if (length(res) == 0) {
                return(list())
            }
            res$alias_name <- .x$alias_name
            return(res)
        }) %>%
        discard(~ length(.) == 0)
    df_normal_range <- normal_range %>%
        map(~ {
            aliasName <- .x$alias_name
            target <- .x %>%
                discard(names(.) == "alias_name")
            res <- target %>%
                map(~ tibble(
                    aliasname = aliasName,
                    name = .x$name,
                    seq = .x$seq,
                    normal_range_lessthan = .x$normal_range$less_than_or_equal_to,
                    normal_range_greaterthan = .x$normal_range$greater_than_or_equal_to
                )) %>%
                bind_rows()
            return(res)
        }) %>%
        bind_rows()
    df_validators <- validators %>%
        map(~ {
            aliasName <- .x$alias_name
            target <- .x %>%
                discard(names(.) == "alias_name")
            res <- target %>%
                map(~ tibble(
                    aliasname = aliasName,
                    name = .x$name,
                    seq = .x$seq,
                    validator_lessthan = .x$validators$numericality$validate_numericality_less_than_or_equal_to,
                    validator_greaterthan = .x$validators$numericality$validate_numericality_greater_than_or_equal
                )) %>%
                bind_rows()
            return(res)
        }) %>%
        bind_rows() %>%
        filter(validator_lessthan != "" | validator_greaterthan != "")
    output_limitation <- df_normal_range %>%
        bind_rows(df_validators) %>%
        inner_join(sheet_orders, by = c("aliasname" = "sheet")) %>%
        arrange(sheet_seq, seq)
    output_limitation_visit <- output_limitation %>%
        left_join(visit_groups, by = c("aliasname" = "sheet_aliasname"))
    output_limitation_visit$aliasname <- output_limitation_visit$aliasname.y
    output_limitation_visit <- output_limitation_visit %>%
        select(aliasname, name, sheet_seq, seq)
    output_limitation_nonvisit <- output_limitation %>%
        anti_join(visit_groups, by = c("aliasname" = "sheet_aliasname")) %>%
        arrange(sheet_seq, seq) %>%
        select(aliasname, name, sheet_seq, seq)
    output_limitation <- output_limitation_visit %>%
        bind_rows(output_limitation_nonvisit) %>%
        arrange(sheet_seq, seq) %>%
        select(-sheet_seq, -seq)
    colnames(output_limitation) <- colnames(limitation)
    if (!identical(output_limitation, limitation)) {
        str(limitation)
        str(output_limitation)
        stop("issue 88 NG")
    }
    #####################################################
    # allocation
    allocation <- excel_file %>%
        readxl::read_excel(sheet = "allocation") %>%
        select(シート名, シート名英数字別名, 割付グループ.コード)
    output_allocation <- input_json$sheets %>%
        keep(~ .$category == "allocation") %>%
        map(
            ~ {
                sheetname <- .$name
                aliasname <- .$alias_name
                res <- .$allocation$groups %>% map(~
                    tibble(
                        シート名 = sheetname,
                        シート名英数字別名 = aliasname,
                        割付グループ.コード = .x$code
                    ))
                return(res)
            }
        ) %>%
        bind_rows()
    if (!identical(allocation, output_allocation)) {
        str(allocation)
        str(output_allocation)
        stop("issue 88 NG")
    }
    #####################################################
    # visit
    visit <- excel_file %>%
        readxl::read_excel(sheet = "visit")

    if (target_trials[i] == "AML224-FLT3-ITD") {
        output_visit <- input_json$visits %>%
            map(~ tibble(
                VISITNUM = .x$num %>% as.numeric(),
                VISIT = .x$name
            )) %>%
            bind_rows() %>%
            arrange(VISITNUM)
    }
    if (!identical(visit, output_visit)) {
        str(visit)
        str(output_visit)
        stop("issue 88 NG")
    }
    #####################################################
    # item_nonvisit
    item_nonvisit <- excel_file %>%
        readxl::read_excel(sheet = "item_nonvisit") %>%
        select("シート名英数字別名", "フィールドID", "ラベル")
    input_items_nonvisit <- input_json$sheets %>% keep(~ .$category != "visit")
    temp <- input_items_nonvisit %>%
        map(~ {
            res <- .$field_items %>% keep(~ .$type == "FieldItem::Article")
            if (length(res) == 0) {
                return(list())
            }
            res$alias_name <- .$alias_name
            return(res)
        }) %>%
        discard(~ length(.) == 0)
    temp2 <- temp %>%
        map(~ {
            aliasName <- .x$alias_name

            fieldItems <- .x %>%
                discard(names(.) == "alias_name") %>%
                map(~ tibble(
                    aliasname = aliasName,
                    name = .x$name,
                    seq = .x$seq,
                    label = .x$label
                )) %>%
                bind_rows() %>%
                arrange(as.numeric(seq))

            fieldItems
        }) %>%
        bind_rows()
    output_item_nonvisit <- temp2 %>%
        inner_join(sheet_orders, by = c("aliasname" = "sheet")) %>%
        arrange(sheet_seq, seq) %>%
        select(-sheet_seq, -seq)
    colnames(output_item_nonvisit) <- colnames(item_nonvisit)
    output_item_nonvisit <- output_item_nonvisit %>% mutate(across(everything(), ~ ifelse(is.na(.), "", .)))
    item_nonvisit <- item_nonvisit %>% mutate(across(everything(), ~ ifelse(is.na(.), "", .)))
    if (!identical(output_item_nonvisit, item_nonvisit)) {
        for (col in colnames(item_nonvisit)) {
            if (!identical(output_item_nonvisit[[col]], item_nonvisit[[col]])) {
                print(str_c("Trial: ", target_trials[i]))
                print(str_c("Excel file: ", excel_file))
                print(str_c("Column: ", col))
                print("Expected:")
                print(item_nonvisit[[col]])
                print("Actual:")
                print(output_item_nonvisit[[col]])
                stop("issue 88 NG")
            }
        }
    }
}
