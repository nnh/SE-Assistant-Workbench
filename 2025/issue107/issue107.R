library(readxl)
library(tidyverse)
library(writexl)
# functions
get_trial_name <- function(filepath) {
    fname <- basename(filepath)
    sub(" eCRF Spec.*$", "", fname)
}
compare_for_visit_sheets <- function(df1, df2, sheet, trial_name) {
    if (
        sheet == "action" | sheet == "option" | sheet == "comment" |
            sheet == "explanation" | sheet == "presence" |
            sheet == "title" | sheet == "assigned" |
            sheet == "limitation" | sheet == "date") {
        df1 <- df1 %>% filter(!(シート名英数字別名 %in% remove_visitSheet$シート名英数字別名))
        df1 <- df1 %>% arrange(across(everything()))
    } else if (sheet == "item_visit_old") {
        if (trial_name == "TAS0728-HER2") {
            message("TAS0728-HER2のitem_visit_oldシートは比較対象外です")
            df1 <- ""
            df2 <- ""
        } else {
            aliasnames <- remove_visitSheet$シート名英数字別名 %>% unlist()
            df1$シート名英数字別名 <- str_remove_all(df1$シート名英数字別名, paste(aliasnames, collapse = "|")) %>%
                str_remove_all(",") %>%
                str_remove_all(" ")
            df1 <- df1 %>% select(-シート名)
            df1 <- df1 %>%
                left_join(visitSheet, by = "シート名英数字別名")
            df1 <- df1 %>% select(シート名, everything())
            targetCols <- c(
                "条件の参照先情報",
                "論理式の参照先情報",
                "最小値の参照先情報",
                "最大値の参照先情報"
            )
            visitSheet <- visitSheet %>% arrange(desc(nchar(group)))
            for (col in targetCols) {
                for (i in seq_len(nrow(visitSheet))) {
                    group_str <- visitSheet$group[i] %>% str_c(",")
                    alias_str <- visitSheet$シート名英数字別名[i] %>% str_c(",")
                    df1[[col]] <- str_replace_all(df1[[col]], fixed(group_str), alias_str)
                }
            }
            df1 <- df1 %>% select(-group)
            df1 <- df1 %>% arrange(across(everything()))
            df1[] <- lapply(df1, as.character)
            df2[] <- lapply(df2, as.character)
        }
    }
    if (!identical(df1, df2)) {
        for (row in 1:nrow(df1)) {
            for (col in 1:ncol(df1)) {
                if (!is.na(df1[row, col]) && !is.na(df2[row, col]) &&
                    df1[row, col] != df2[row, col]) {
                    stop(sprintf(
                        "試験名「%s」のシート「%s」で行 %d 列 %d の値が異なります: '%s' vs '%s'",
                        get_trial_name(inputPath1), sheet, row, col,
                        df1[row, col], df2[row, col]
                    ))
                }
            }
        }
        return(list(df1 = df1, df2 = df2))
    } else {
        return(NULL)
    }
}
compare_excel_sheets <- function(file1, file2) {
    remove_visitSheet <<- NULL
    visitSheet <<- NULL
    trial_name <- get_trial_name(file1)
    output_file <- file.path(Sys.getenv("USERPROFILE"), "Downloads", paste0(trial_name, "_eCRF_Spec_diff.xlsx"))
    # シート名取得
    sheets1 <- excel_sheets(file1)
    sheets2 <- excel_sheets(file2)

    # 共通シートのみ比較
    common_sheets <- intersect(sheets1, sheets2)
    # シート名が一致しない場合はエラー
    if (!setequal(sheets1, sheets2)) {
        stop(sprintf("試験名「%s」でシート名の一覧が一致しません。", trial_name))
    }
    # 比較結果を格納するリスト
    diff_list <- list()
    # VISIT情報を保存
    input_visitSheet <- read_excel(file1, sheet = "visit") %>% select(シート名英数字別名, シート名)
    input_visitSheet$group <- input_visitSheet[["シート名英数字別名"]] %>% str_remove("_[0-9]+$")
    input_visitSheet$visitNum <- input_visitSheet[["シート名英数字別名"]] %>%
        str_extract("[0-9]+$") %>%
        {
            ifelse(is.na(.), -1L, as.integer(.))
        }
    remove_visitSheet <- input_visitSheet %>%
        group_by(group) %>%
        filter(visitNum != min(visitNum)) %>%
        ungroup()
    visitSheet <- input_visitSheet %>%
        filter(!(シート名英数字別名 %in% remove_visitSheet$シート名英数字別名))
    remove_visitSheet <<- remove_visitSheet
    visitSheet <<- visitSheet %>% select(c("シート名英数字別名", "シート名", "group"))

    for (sheet in common_sheets) {
        df1 <- read_excel(file1, sheet = sheet)
        df2 <- read_excel(file2, sheet = sheet)

        # 列名が一致しない場合はエラー
        if (!identical(names(df1), names(df2))) {
            stop(sprintf("試験名「%s」のシート「%s」で列名が一致しません。", trial_name, sheet))
        }

        # ソート
        df1 <- df1 %>% arrange(across(everything()))
        df2 <- df2 %>% arrange(across(everything()))

        # 差分抽出
        only_in_1 <- suppressMessages(anti_join(df1, df2))
        only_in_2 <- suppressMessages(anti_join(df2, df1))

        if (nrow(only_in_1) > 0 || nrow(only_in_2) > 0) {
            # 再チェックを行う
            if (sheet == "item_visit_old" |
                sheet == "action" | sheet == "option" | sheet == "comment" |
                sheet == "explanation" | sheet == "presence" |
                sheet == "title" | sheet == "assigned" |
                sheet == "limitation" | sheet == "date") {
                temp <- compare_for_visit_sheets(df1, df2, sheet, trial_name)
                if (is.null(temp)) {
                    only_in_1 <- NULL
                    only_in_2 <- NULL
                }
                rm(temp)
            } else if (sheet == "item_visit") {
                if (trial_name == "TAS0728-HER2") {
                    message("TAS0728-HER2のitem_visitシートは比較対象外です")
                    only_in_1 <- NULL
                    only_in_2 <- NULL
                } else {
                    #  "数値チェック・アラート条件の有無"だけdf1, df2で比較、一致しない場合はエラー
                    if (!identical(df1$`数値チェック・アラート条件の有無`, df2$`数値チェック・アラート条件の有無`)) {
                        stop(sprintf("試験名「%s」のシート「%s」で「数値チェック・アラート条件の有無」が一致しません。", trial_name, sheet))
                    }
                    # df2をitem_visit_oldと比較する
                    item_visit <- df2 %>% select(-`数値チェック・アラート条件の有無`)
                    item_visit_old <- read_excel(file2, sheet = "item_visit_old")
                    item_visit_old$col <- item_visit_old$シート名 %>% sub("\\([^()]*\\)$", "", .)
                    item_visit_old_for_compare <- item_visit_old %>%
                        select(c("col", "ラベル"))
                    item_visit_old_count <- item_visit_old_for_compare %>%
                        group_by(col, ラベル) %>%
                        summarise(count = n(), .groups = "drop")
                    item_visit_old_count_wide <- item_visit_old_count %>%
                        pivot_wider(names_from = col, values_from = count, values_fill = 0)
                    # 列名が一致しない場合はエラー
                    if (!identical(names(item_visit_old_count_wide), names(item_visit))) {
                        stop("item_visit_old_count_wideとitem_visitの列名が一致しません。")
                    }
                    # 列の並びをitem_visitに合わせる
                    common_cols <- intersect(names(item_visit_old_count_wide), names(item_visit))
                    item_visit_old_count_wide <- item_visit_old_count_wide %>% select(all_of(common_cols))
                    item_visit <- item_visit %>% select(all_of(common_cols))
                    # 行のソートをitem_visitに合わせる
                    if ("ラベル" %in% names(item_visit)) {
                        item_visit_old_count_wide <- item_visit_old_count_wide %>% arrange(ラベル)
                        item_visit <- item_visit %>% arrange(ラベル)
                    }
                    item_visit_old_count_wide[] <- lapply(item_visit_old_count_wide, as.character)
                    item_visit[] <- lapply(item_visit, as.character)
                    if (!identical(item_visit_old_count_wide, item_visit)) {
                        for (row in 1:nrow(item_visit_old_count_wide)) {
                            for (col in 1:ncol(item_visit_old_count_wide)) {
                                if (!is.na(item_visit_old_count_wide[row, col]) &&
                                    !is.na(item_visit[row, col]) &&
                                    item_visit_old_count_wide[row, col] != item_visit[row, col]) {
                                    stop(sprintf(
                                        "試験名「%s」のシート「%s」で行 %d 列 %d の値が異なります: '%s' vs '%s'",
                                        trial_name, sheet, row, col,
                                        item_visit_old_count_wide[row, col], item_visit[row, col]
                                    ))
                                }
                            }
                        }
                    } else {
                        only_in_1 <- NULL
                        only_in_2 <- NULL
                    }
                }
            } else {
                stop(sprintf("試験名「%s」のシート「%s」で差分があります。", trial_name, sheet))
            }
        }

        # 差分がある場合のみリストに追加
        if (!is.null(only_in_1) || !is.null(only_in_2)) {
            if (nrow(only_in_1) > 0 || nrow(only_in_2) > 0) {
                diff_list[[paste0(sheet, "_only_in_", basename(file1))]] <- only_in_1
                diff_list[[paste0(sheet, "_only_in_", basename(file2))]] <- only_in_2
            }
        }
    }
    if (length(diff_list) == 0) {
        message(sprintf("試験名「%s」で差分はありません。", trial_name))
        return(NULL)
    } else {
        warning(sprintf("試験名「%s」で差分があります。", trial_name))
        return(diff_list)
    }
}

inputPath1 <- "C:/Users/MarikoOhtsuka/Documents/GitHub/ptosh-json-to-excel/output/20250731/"
inputFiles1 <- list.files(inputPath1, full.names = FALSE)
trials <- str_remove_all(inputFiles1, "output_[0-9]+")
inputPath2 <- "C:/Users/MarikoOhtsuka/Documents/GitHub/ptosh-json-to-excel/output/"
inputFiles2 <- list.dirs(inputPath2, full.names = FALSE, recursive = FALSE) %>%
    str_extract_all("output_[0-9]+.*$") %>%
    unlist()
for (trial in trials) {
    file1 <- str_match(inputFiles1, paste0("output_[0-9]+", trial)) %>%
        na.omit() %>%
        .[1, ]
    file2 <- str_match(inputFiles2, paste0("output_[0-9]+", trial)) %>%
        na.omit() %>%
        .[1, ]
    input1 <- file.path(inputPath1, file1, "list") %>%
        list.files(full.names = TRUE) %>%
        .[1]
    input2 <- file.path(inputPath2, file2, "list") %>%
        list.files(full.names = TRUE) %>%
        .[1]
    res <- compare_excel_sheets(input1, input2)
}
