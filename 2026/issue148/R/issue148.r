rm(list = ls())
library(jsonlite)
library(purrr)
library(tidyverse)
library(readxl)
library(here)
library(googlesheets4)

write_to_google_sheet <- function(df) {
    ss_id <- config$spreadsheet_id
    target_sheet <- config$sheet_name
    range_clear(config$spreadsheet_id, sheet = config$sheet_name, range = "A2:Z10000")
    range_write(
        ss = ss_id,
        sheet = target_sheet,
        data = df,
        range = "A2", # ここで開始位置を指定
        col_names = FALSE, # 列名は書き込まない
        reformat = FALSE # スプレッドシート側の書式（色や枠線）を壊さない
    )

    message("スプレッドシートの2行目以降への書き込みが完了しました！")
}

library(tidyverse)

summarize_wos_addresses <- function(df_authors) {
    # 1. GASと同じ「走査順」で住所のユニークなマスターリストを作成
    address_master_order <- df_authors %>%
        group_by(source_file, uid) %>%
        mutate(author_order = row_number()) %>%
        separate_rows(full_addresses, sep = ";\\s*") %>%
        # 空白やNAを除外
        filter(!is.na(full_addresses) & full_addresses != "" & full_addresses != "NA") %>%
        group_by(source_file, uid) %>%
        # データに出現した「絶対的な順番」でユニークな住所にIDを振る
        mutate(address_appearance_id = match(full_addresses, unique(full_addresses))) %>%
        ungroup()

    # 2. 著者ラベル等の基本情報（判定ロジックを修正）
    df_base <- df_authors %>%
        group_by(source_file, uid) %>%
        mutate(original_order = row_number()) %>%
        ungroup() %>%
        mutate(
            # ソースファイル名からIDを抽出（例: "311.json" -> "311"）
            target_facility_id = str_remove(source_file, "\\.json$"),
            author_label = case_when(
                # 条件：筆頭著者であり、かつ facility_numbers の中に target_facility_id が含まれている
                isFirstAuthor == TRUE & str_detect(as.character(facility_numbers), fixed(target_facility_id)) ~ "（筆頭筆者）",

                # 条件：筆頭著者だが、自施設IDが含まれていない
                isFirstAuthor == TRUE ~ "（筆頭筆者以外）",

                # 筆頭著者以外
                TRUE ~ NA_character_
            )
        )

    # 3. 著者リスト列（変更なし）
    authors_flat <- df_base %>%
        group_by(source_file, uid) %>%
        summarise(
            all_authors_list = paste(name[order(original_order)], collapse = ","),
            # ラベルを結合（NAを除外）
            author_label_list = paste(na.omit(author_label[order(original_order)]), collapse = ""),
            .groups = "drop"
        )

    # 4. 住所情報の集約（appearance_rankを維持）
    address_summary <- address_master_order %>%
        distinct(source_file, uid, name, full_addresses, .keep_all = TRUE) %>%
        group_by(source_file, uid, full_addresses) %>%
        summarise(
            appearance_rank = min(address_appearance_id),
            author_list = paste0("[", paste(name[order(author_order)], collapse = "; "), "]"),
            .groups = "drop"
        ) %>%
        mutate(address_with_authors = paste(author_list, full_addresses)) %>%
        group_by(source_file, uid) %>%
        summarise(
            final_full_addresses = paste(address_with_authors[order(appearance_rank)], collapse = "; "),
            .groups = "drop"
        )

    # 5. 結合
    final_summary <- left_join(authors_flat, address_summary, by = c("source_file", "uid"))

    return(final_summary)
}

process_wos_json <- function(wos_entry, file_name) {
    # 1. ベースデータの展開（1ファイル内の複数論文に対応）
    base_df <- tibble(data = wos_entry) %>%
        unnest_wider(data) %>%
        mutate(source_file = file_name)

    # 2. authors（著者と所属）の表
    # 著者ごとに組織リストが含まれるため、組織を文字列にまとめてから展開します
    df_authors <- base_df %>%
        select(source_file, uid, authors) %>%
        unnest_longer(authors) %>%
        unnest_wider(authors) %>%
        # 各著者の organizations リストを処理
        mutate(
            # 所属組織名(content)を連結
            affiliations = map_chr(organizations, function(org_list) {
                if (is.null(org_list) || length(org_list) == 0) {
                    return(NA_character_)
                }
                map_chr(org_list, ~ paste(unlist(.x$content), collapse = "/")) %>%
                    paste(collapse = "; ")
            }),
            # フルアドレスを連結
            full_addresses = map_chr(organizations, function(org_list) {
                if (is.null(org_list) || length(org_list) == 0) {
                    return(NA_character_)
                }
                map_chr(org_list, "fullAddress") %>% paste(collapse = "; ")
            }),
            # 施設番号を連結
            facility_numbers = map_chr(organizations, function(org_list) {
                if (is.null(org_list) || length(org_list) == 0) {
                    return(NA_character_)
                }
                # facilityNumberがない要素もあるため、安全に抽出
                map(org_list, "facilityNumber") %>%
                    keep(~ !is.null(.x)) %>%
                    unlist() %>%
                    paste(collapse = "; ")
            })
        ) %>%
        select(-organizations) # 元のリスト列を削除

    # 3. metadata（著者以外の表）
    # 残ったリスト形式の列（docTypes, page, pubmed等）をフラット化
    df_metadata <- base_df %>%
        select(-authors) %>%
        mutate(across(where(is.list), function(col) {
            # 列名を取得するために cur_column() を使用
            col_name <- cur_column()

            map_chr(col, function(x) {
                if (is.null(x) || length(x) == 0) {
                    return(NA_character_)
                }

                # docTypes の場合はカンマ区切り、それ以外は従来通りセミコロン区切り
                sep <- if (col_name == "docTypes") "," else "; "
                paste(unlist(x), collapse = sep)
            })
        })) %>%
        mutate(page = case_when(
            # アルファベット、数字、ドット、ハイフンを含む「範囲」の形式を抽出
            str_detect(page, "-") ~ str_extract(page, "[A-Za-z0-9.]+-[A-Za-z0-9.]+"),
            TRUE ~ page
        ))
    return(list(
        authors = df_authors,
        metadata = df_metadata
    ))
}
# 施設名テーブル読み込み
facility_table <- read_excel(here("（仮）施設名テーブル.xlsx")) %>% select(ダミー1, ダミー8)
colnames(facility_table) <- c("facility_code", "facility_name")
# 対象ディレクトリ
dir_path <- "/Users/mariko/Downloads/evaluation_2025/facilities"

# JSONファイル一覧取得
json_files <- list.files(
    path = dir_path,
    pattern = "\\.json$",
    full.names = TRUE
)

# 読み込んでリスト化
json_list <- map(json_files, ~ fromJSON(.x, simplifyVector = FALSE))
names(json_list) <- basename(json_files)

wos_list <- map(json_list, ~ .x$papers)

all_results <- imap(wos_list, ~ process_wos_json(.x, .y))
final_authors <- map_dfr(all_results, "authors")
final_metadata <- map_dfr(all_results, "metadata")

address_summary <- summarize_wos_addresses(final_authors)

temp_final_table <- left_join(final_metadata, address_summary, by = c("source_file", "uid"))
temp_final_table$facility_code <- str_remove(temp_final_table$source_file, "\\.json$") %>% as.double()
temp_final_table_with_facility <- left_join(temp_final_table, facility_table, by = "facility_code")

final_table <- temp_final_table_with_facility %>%
    # ダミー列をまとめて作成（中身は空文字）
    mutate(
        dummy1 = "", dummy2 = "", dummy3 = "",
        dummy4 = "", dummy5 = "", dummy6 = "",
        dummy7 = ""
    ) %>%
    # 列順を指定
    select(
        facility_code,
        facility_name,
        dummy1,
        uid,
        all_authors_list,
        title,
        publicationName,
        vol,
        issue,
        page,
        pubYear,
        pubMonth,
        final_full_addresses,
        dummy2,
        docTypes,
        dummy3, dummy4, dummy5, dummy6,
        author_label_list,
        dummy7,
        pubMedId,
        targetDate,
    ) %>% arrange(facility_code, targetDate)

config <- fromJSON(here("config.json"))
gs4_auth()
write_to_google_sheet(final_table)
