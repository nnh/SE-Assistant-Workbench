rm(list = ls())
source("C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\SE-Assistant-Workbench\\2025\\issue138\\issue138_common.R")
# 各シート内の表示はSeq順にする
# 88 In nnh/ptosh-json-to-excel;· MarikoOhtsuka opened 4 days ago
for (i in 1:length(target_trials)) {
    if (is.na(target_folders[[target_trials[i]]])) {
        next
    }
    print(str_c("Checking trial: ", target_trials[i]))
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
    print("assignedの並び順がfield_item内のseq順になっているか確認")
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
    if (nrow(visit_groups) > 0) {
        output_assigned <- output_assigned %>%
            left_join(visit_groups, by = c("aliasname" = "sheet_aliasname"))
        output_assigned$aliasname <- ifelse(is.na(output_assigned$aliasname.y), output_assigned$aliasname, output_assigned$aliasname.y)
    }
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
    print("masterの並び順がfield_item内のseq順になっているか確認")
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
    print("nameの並び順がsheet_ordersのseq順になっているか確認")
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
    print("optionの並び順がfield_item内のseq順になっているか確認")
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
    if (nrow(visit_groups) > 0) {
        output_option <- output_option %>%
            left_join(visit_groups, by = c("aliasname" = "sheet_aliasname"))
        output_option$aliasname <- ifelse(is.na(output_option$aliasname.y), output_option$aliasname, output_option$aliasname.y)
    }
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
    print("dateの並び順がfield_item内のseq順になっているか確認")
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
    if (nrow(visit_groups) > 0) {
        output_date_visit <- output_date %>%
            left_join(visit_groups, by = c("aliasname" = "sheet_aliasname"))
        output_date_visit$aliasname <- ifelse(is.na(output_date_visit$aliasname.y), output_date_visit$aliasname, output_date_visit$aliasname.y)
    } else {
        output_date_visit <- output_date
    }
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
    print("limitationの並び順がfield_item内のseq順になっているか確認")
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
    if (nrow(visit_groups) > 0) {
        output_limitation_visit <- output_limitation %>%
            left_join(visit_groups, by = c("aliasname" = "sheet_aliasname"))
        output_limitation_visit$aliasname <- output_limitation_visit$aliasname.y
    } else {
        output_limitation_visit <- output_limitation
    }
    output_limitation_visit <- output_limitation_visit %>%
        select(aliasname, name, sheet_seq, seq)
    if (nrow(visit_groups) > 0) {
        output_limitation_nonvisit <- output_limitation %>%
            anti_join(visit_groups, by = c("aliasname" = "sheet_aliasname")) %>%
            arrange(sheet_seq, seq) %>%
            select(aliasname, name, sheet_seq, seq)
    } else {
        output_limitation_nonvisit <- tibble()
    }
    output_limitation <- output_limitation_visit %>%
        bind_rows(output_limitation_nonvisit) %>%
        arrange(sheet_seq, seq) %>%
        select(-sheet_seq, -seq) %>%
        distinct()
    colnames(output_limitation) <- colnames(limitation)
    if (!identical(output_limitation, limitation)) {
        str(limitation)
        str(output_limitation)
        stop("issue 88 NG")
    }
    #####################################################
    # allocation
    print("allocationが想定通りに出力されているか確認")

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
        print("visit対応試験の場合、visitの並び順がvisitnum順になっているか確認")
        output_visit <- input_json$visits %>%
            map(~ tibble(
                VISITNUM = .x$num %>% as.numeric(),
                VISIT = .x$name
            )) %>%
            bind_rows() %>%
            arrange(VISITNUM)
    } else {
        print("visit非対応試験はテストスキップ")
        output_visit <- visit
    }
    if (!identical(visit, output_visit)) {
        str(visit)
        str(output_visit)
        stop("issue 88 NG")
    }
    #####################################################
    # item_nonvisit
    print("item_nonvisitの並び順がfield_item内のseq順になっているか確認")
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
                for (row in 1:nrow(item_nonvisit)) {
                    actual_value <- item_nonvisit[[col]][row] %>% str_trim()
                    expected_value <- output_item_nonvisit[[col]][row] %>% str_trim()
                    if (actual_value != expected_value) {
                        print(str_c("Trial: ", target_trials[i]))
                        print("item_nonvisitの内容が想定と異なる")
                        print(str_c("Row: ", row))
                        print(str_c("Expected: ", item_nonvisit[[col]][row]))
                        print(str_c("Actual: ", output_item_nonvisit[[col]][row]))
                        stop("issue 88 NG")
                    }
                }
            }
        }
    }
    ## item_visit
    print("item_visitの確認")
    item_visit <- excel_file %>%
        readxl::read_excel(sheet = "item_visit")
    if (nrow(visit_groups) == 0) {
        # item_visitの値が全てNAでない場合はエラー
        if (all(!is.na(item_visit))) {
            stop("item_visit　エラー")
        }
        next
    }
    input_item_visit <- input_json$sheets %>% keep(~ .$category == "visit")
    temp <- input_item_visit %>%
        map(~ {
            res <- .$field_items %>% keep(~ .$type == "FieldItem::Article")
            if (length(res) == 0) {
                return(list())
            }
            temp_name <- .$name %>%
                str_split(pattern = "\\(") %>%
                .[[1]] %>%
                .[[1]] %>%
                str_trim()
            res2 <- res %>%
                map(~ tibble(label = .$label, name = temp_name)) %>%
                bind_rows()
            return(list(res = res2, name = temp_name))
        }) %>%
        discard(~ length(.) == 0)
    temp2 <- temp
    # tempのnameが重複している要素は削除
    if (length(temp2) > 0) {
        name_vec <- map_chr(temp2, ~ .x$name)
        duplicated_idx <- duplicated(name_vec)
        if (any(duplicated_idx)) {
            temp2 <- temp2[!duplicated_idx]
        }
    }
    temp3 <- temp2 %>%
        map(~ .x$res) %>%
        bind_rows()
    temp3$count <- NA_integer_
    # temp3のnameごとのlabelの数をカウントする
    for (i in 1:nrow(temp3)) {
        temp_name <- temp3$name[i]
        temp_label <- temp3$label[i]
        temp_count <- temp3 %>%
            filter(name == temp_name & label == temp_label) %>%
            nrow()
        temp3$count[i] <- temp_count
    }
    temp4 <- temp3 %>% distinct()
    visit_groups_for_itemvisit <- input_json$visit_groups %>%
        map(~ tibble(name = .$name, aliasname = .$alias_name)) %>%
        bind_rows() %>%
        left_join(visit_groups, by = c("aliasname" = "aliasname")) %>%
        left_join(sheet_orders, by = c("sheet_aliasname" = "sheet")) %>%
        arrange(sheet_seq)
    # 同じnameがあったらsheet_seqの小さい方を採用する
    visit_groups_for_itemvisit_2 <- visit_groups_for_itemvisit
    for (i in 1:nrow((visit_groups_for_itemvisit_2))) {
        temp_name <- visit_groups_for_itemvisit_2$name[i]
        idx <- i + 1
        if (is.na(temp_name)) {
            next
        }
        for (j in idx:nrow(visit_groups_for_itemvisit_2)) {
            if (is.na(visit_groups_for_itemvisit_2$name[j])) {
                next
            }
            if (visit_groups_for_itemvisit_2$name[j] == temp_name) {
                visit_groups_for_itemvisit_2$name[j] <- NA_character_
            }
        }
    }
    visit_groups_for_itemvisit_3 <- visit_groups_for_itemvisit_2 %>%
        filter(!is.na(name)) %>%
        arrange(sheet_seq)
    # 列の並びを確認
    input_itemvisit_colnames <- colnames(item_visit)
    expected_colnames <- c("label", visit_groups_for_itemvisit_3$name, "数値チェック・アラート条件の有無")
    if (!identical(input_itemvisit_colnames, expected_colnames)) {
        print(str_c("Trial: ", target_trials[i]))
        print("item_visitの列の並びが想定と異なる")
        print(expected_colnames)
        print(input_itemvisit_colnames)
        stop("issue 88 NG")
    }
    # 値の確認おもて
    for (col in 1:(ncol(item_visit))) {
        excel_colname <- colnames(item_visit)[col]
        if (excel_colname == "label" || excel_colname == "数値チェック・アラート条件の有無") {
            next
        }
        for (row in 1:nrow(item_visit)) {
            actual_value <- item_visit[[row, col]]
            actual_label <- item_visit$label[row]
            if (is.na(actual_label)) {
                actual_label <- ""
            }
            expected_value <- temp4 %>%
                filter(name == excel_colname & str_trim(label) == str_trim(actual_label)) %>%
                .$count
            if (length(expected_value) == 0) {
                expected_value <- 0
            }

            if (actual_value == expected_value) {
                next
            } else {
                print(str_c("Trial: ", target_trials[i]))
                print(str_c("Excel file: ", excel_file))
                print(str_c("Column: ", excel_colname))
                print(str_c("Label: ", item_visit$label[row]))
                print(str_c("Expected: ", expected_value))
                print(str_c("Actual: ", actual_value))
                stop("issue 88 NG")
            }
        }
    }
    # 値の確認うら
    for (row in 1:(nrow(temp4))) {
        expected_label <- temp4$label[row]
        if (expected_label == "") {
            expected_label <- NA
        }
        expected_name <- temp4$name[row]
        expected_count <- temp4$count[row]
        if (is.na(expected_label)) {
            actual_count <- item_visit %>%
                filter(is.na(label)) %>%
                select(all_of(expected_name)) %>%
                unlist(use.names = FALSE)
        } else {
            actual_count <- item_visit %>%
                filter(str_trim(label) == str_trim(expected_label)) %>%
                select(all_of(expected_name)) %>%
                unlist(use.names = FALSE)
        }
        if (length(actual_count) == 0) {
            stop("issue 88 NG")
        }
        if (expected_count != actual_count) {
            print(str_c("Trial: ", target_trials[i]))
            print(str_c("Excel file: ", excel_file))
            print(str_c("Column: ", expected_name))
            print(str_c("Label: ", expected_label))
            print(str_c("Expected: ", expected_count))
            print(str_c("Actual: ", actual_count))
            stop("issue 88 NG")
        }
    }
    temp5 <- temp4 %>%
        inner_join(visit_groups_for_itemvisit_3, by = c("name" = "name")) %>%
        select(label, sheet_aliasname, sheet_seq)
    temp5$seq <- NA_integer_
    for (i in 1:nrow(temp5)) {
        label <- temp5$label[i]
        sheet_aliasname <- temp5$sheet_aliasname[i]
        target_sheet <- input_json$sheets %>%
            keep(~ .$alias_name == sheet_aliasname) %>%
            .[[1]]
        if (is.null(target_sheet)) {
            stop("issue 88 NG")
        }
        field_items <- target_sheet$field_items %>% keep(~ .$label == label)
        if (length(field_items) == 0) {
            stop("issue 88 NG")
        } else {
            field_items <- field_items[[1]]
        }
        field_seq <- field_items$seq %>% as.numeric()
        temp5$seq[i] <- field_seq
    }
    temp6 <- temp5 %>%
        arrange(sheet_seq, seq)
    for (i in 1:nrow(temp6)) {
        if (sheet_aliasname == "") {
            next
        }
        temp_label <- temp6$label[i]
        idx <- i + 1
        if (idx > nrow(temp6)) {
            next
        }
        for (j in idx:nrow(temp6)) {
            if (sheet_aliasname == "") {
                next
            }
            if (!is.na(temp_label) & is.na(temp6$label[j])) {
                next
            }
            if (is.na(temp_label) & !is.na(temp6$label[j])) {
                next
            }
            if (is.na(temp_label) & is.na(temp6$label[j])) {
                temp6$label[j] <- NA
                temp6$sheet_aliasname[j] <- ""
                next
            }
            if (temp_label == temp6[j, "label"]) {
                temp6$label[j] <- NA
                temp6$sheet_aliasname[j] <- ""
            }
        }
    }
    temp7 <- temp6 %>%
        filter(!is.na(label)) %>%
        arrange(sheet_seq, seq)
    expected_labels <- temp7$label
    actual_labels <- item_visit$label %>% as.character()
    if (!identical(expected_labels, actual_labels)) {
        for (k in seq_along(expected_labels)) {
            if (expected_labels[k] == "" & is.na(actual_labels[k])) {
                next
            }
            expected_label <- expected_labels[k] %>% str_trim()
            actual_label <- actual_labels[k] %>% str_trim()
            if (expected_label != actual_label) {
                print(str_c("Trial: ", target_trials[i]))
                print("item_visitのラベルの並び順が想定と異なる")
                print(str_c("Index: ", k))
                print(str_c("Expected: ", expected_labels[k]))
                print(str_c("Actual: ", actual_labels[k]))
                stop("issue 88 NG")
            }
        }
    }
}
print("issue 88 OK")
