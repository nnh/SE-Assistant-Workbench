rm(list = ls())
source("C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\SE-Assistant-Workbench\\2025\\issue138\\issue138_common.R")
# item_visit_old、display、comment、explanation、presence、title、actionを削除する。
# 85 In nnh/ptosh-json-to-excel;· MarikoOhtsuka opened 4 days ago
# シート名「item」を「item_nonvisit」に修正する。
# 84 In nnh/ptosh-json-to-excel;· MarikoOhtsuka opened 4 days ago
# ファイル名：[試験名略称] eCRF Spec [YYYYMMDD].xlsxの左からのシート順序は、「specification」の上から順に表示する。
# 83 In nnh/ptosh-json-to-excel;· MarikoOhtsuka opened 4 days ago
issue83 <- c("item_visit", "item_nonvisit", "visit", "allocation", "limitation", "date", "option", "name", "master", "assigned")

for (trial in target_trials) {
    if (is.na(target_folders[[trial]])) {
        next
    }
    print(str_c("Checking trial: ", trial))
    folder_path <- file.path(
        "C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\ptosh-json-to-excel\\output",
        target_folders[[trial]],
        "list"
    )
    excel_file <- list.files(folder_path, pattern = "\\.xlsx$", full.names = TRUE)
    excel_sheets <- readxl::excel_sheets(excel_file)
    # issue 83, 84, 85確認
    if (!identical(excel_sheets, issue83)) {
        print(str_c("Trial: ", trial))
        print(str_c("Excel file: ", excel_file))
        print("Sheets:")
        print(excel_sheets)
        stop("issue 83 NG")
    }
    # シート名「visit」はA列とB列削除、VISITとVISITNUMの情報のみにする（eCRF要件定義書の「VISIT_ARM」シートと比較するため）
    # 87 In nnh/ptosh-json-to-excel;· MarikoOhtsuka opened 4 days ago
    issue87 <- readxl::read_excel(excel_file, sheet = "visit")
    if (trial == "AML224-FLT3-ITD") {
        if (!identical(colnames(issue87), c("VISITNUM", "VISIT"))) {
            stop("issue 87 NG")
        }
    } else {
        if (!identical(colnames(issue87), c("シート名", "シート名英数字別名", "フィールドID", "デフォルト値"))) {
            stop("issue 87 NG")
        }
    }
}
print("issue 83, 84, 85, 87 OK")
