library(readxl)
library(dplyr)
library(stringr)
get_latest_trial_folder <- function(trial_name, output_dir = "C:/Users/MarikoOhtsuka/Documents/GitHub/ptosh-json-to-excel/output") {
    folders <- list.dirs(output_dir, full.names = TRUE, recursive = FALSE)
    pattern <- "^output_([0-9]{14})([a-zA-Z0-9_-]+)$"
    matched_folders <- folders[grepl(pattern, basename(folders))]
    info <- regexec(pattern, basename(matched_folders))
    matches <- regmatches(basename(matched_folders), info)
    df <- do.call(rbind, lapply(seq_along(matches), function(i) {
        x <- matches[[i]]
        if (length(x) == 3 && x[3] == trial_name) c(x[2], x[3], matched_folders[i]) else NULL
    }))
    if (!is.null(df) && nrow(df) > 0) {
        df <- as.data.frame(df, stringsAsFactors = FALSE)
        colnames(df) <- c("datetime", "trial", "folder")
        latest_idx <- which.max(df$datetime)
        return(df$folder[latest_idx])
    } else {
        return(NA)
    }
}

# 　ptosh-json-to-excelの出力フォルダから最新のAML224-PIFのフォルダを取得
target_path <- get_latest_trial_folder("AML224-PIF")
excel_files <- list.files(file.path(target_path, "list"), pattern = "\\.xlsx$", full.names = TRUE)
if (length(excel_files) == 1) {
    ptosh_json_to_excel_item_visit_sheet <- read_excel(excel_files[1], sheet = "item_visit")
    ptosh_json_to_excel_item_visit_old_sheet <- read_excel(excel_files[1], sheet = "item_visit_old")
} else {
    stop("listフォルダ内にエクセルファイルが1つだけ存在しません。")
}
# 直接ダウンロードしたエクセルファイルを読み込む
download_dir <- file.path(Sys.getenv("USERPROFILE"), "Downloads")
file_name <- "cpyAML224-PIF eCRF Spec 20250728 item_visit見本.xlsx"
file_path <- file.path(download_dir, file_name)

download_item_visit_sheet <- read_excel(file_path, sheet = "item_visit", skip = 3)
# 総計行は不要なので削除
download_item_visit_sheet <- download_item_visit_sheet %>% filter(行ラベル != "総計" | is.na(行ラベル))
View(ptosh_json_to_excel_item_visit_sheet)
View(download_item_visit_sheet)

# ラベルの比較
compare_label <- identical(sort(download_item_visit_sheet$行ラベル), sort(ptosh_json_to_excel_item_visit_sheet$ラベル))
if (compare_label) {
    message("ラベルは一致しています。")
} else {
    stop("ラベルが一致しません。")
}
# 列がシート名なのでその比較を行う
ptosh_json_to_excel_sheet_colnames <- colnames(ptosh_json_to_excel_item_visit_sheet)
download_item_visit_sheet_colnames <- colnames(download_item_visit_sheet) %>% str_remove_all("\\s*\\([0-9a-zA-Z]*\\)$")
checkColnames1 <- setdiff(
    ptosh_json_to_excel_sheet_colnames,
    c("ラベル", "数値チェック・アラート条件の有無")
)
checkColnames2 <- setdiff(
    download_item_visit_sheet_colnames,
    c("行ラベル", "総計")
)
if (identical(sort(checkColnames1), sort(checkColnames2))) {
    message("シート名は一致しています。")
} else {
    stop("シート名が一致しません。")
}
sheetNames <- intersect(ptosh_json_to_excel_sheet_colnames, download_item_visit_sheet_colnames)
colnames(download_item_visit_sheet) <- download_item_visit_sheet_colnames
for (sheetName in sheetNames) {
    for (label in ptosh_json_to_excel_item_visit_sheet$ラベル) {
        if (is.na(label)) {
            next
        } else {
            checkCell1 <- ptosh_json_to_excel_item_visit_sheet %>%
                filter(ラベル == label) %>%
                select(all_of(sheetName)) %>%
                pull()
            checkCell2 <- download_item_visit_sheet %>%
                filter(行ラベル == label) %>%
                select(all_of(sheetName)) %>%
                pull()
        }
        if (checkCell1 == 0 && is.na(checkCell2)) {
            next
        } else if (is.na(checkCell1) && checkCell2 == 0) {
            next
        } else if (checkCell1 != checkCell2) {
            # OK
            # if (label == "投与開始日" && sheetName == "VEN/AZA 試験治療報告.." && checkCell1 == 8 && checkCell2 == 2) {
            #     next
            # } else if (sheetName == "VEN/AZA 試験治療報告.." && checkCell1 == 4 && checkCell2 == 1) {
            #     next
            # } else if (sheetName == "効果判定報告" && checkCell1 == 9 && checkCell2 == 1) {
            #     next
            # } else if (sheetName == "寛解導入療法後 試験治療報告" && checkCell1 == 3 && checkCell2 == 1) {
            #     next
            # } else if (sheetName == "有害事象報告" && checkCell1 == 11 && checkCell2 == 1) {
            #     next
            # } else {
                stop(paste(
                    "値が一致しません:", label, "シート:", sheetName,
                    "ptosh-json-to-excelの値:", checkCell1,
                    "ダウンロードした値:", checkCell2
                ))
            #}
        }
    }
}
message("全ての値が想定通りです。")
# item_visit_old$数値チェック・アラート条件の有無とitem_visit$数値チェック・アラート条件の有無の比較
for (row in 1:nrow(ptosh_json_to_excel_item_visit_old_sheet)) {
    label <- ptosh_json_to_excel_item_visit_old_sheet[row, "ラベル", drop = T][[1]]
    numericCheck1 <- ptosh_json_to_excel_item_visit_old_sheet[row, "数値チェック・アラート条件の有無"][[1]]
    if (is.na(label)) {
        next
    }
    numericCheck2 <- ptosh_json_to_excel_item_visit_sheet %>%
        filter(ラベル == label) %>%
        .[["数値チェック・アラート条件の有無"]] %>%
        unlist()
    if (!identical(numericCheck1, numericCheck2)) {
        stop(paste(
            "数値チェック・アラート条件の有無が一致しません:",
            label, "ptosh-json-to-excelの値:", numericCheck1,
            "ダウンロードした値:", numericCheck2
        ))
    }
}
message("数値チェック・アラート条件の有無は一致しています。")
