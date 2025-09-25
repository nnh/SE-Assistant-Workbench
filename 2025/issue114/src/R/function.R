# 再帰的に title を集める関数
extract_titles <- function(x) {
    titles <- character(0)

    if (is.list(x)) {
        # title 要素があれば追加
        if (!is.null(x$title)) {
            titles <- c(titles, cleaning_title(x$title))
        }
        # children があれば再帰呼び出し
        if (!is.null(x$children) && is.list(x$children)) {
            child_titles <- unlist(lapply(x$children, extract_titles))
            titles <- c(titles, cleaning_title(child_titles))
        }
    }

    return(titles)
}
cleaning_title <- function(text) {
    text %>%
        str_remove_all("…") %>%
        str_remove_all("\\.{2,}")
}
# ファイル名からプロトコル名とバージョン情報を取得
extract_version_info <- function(pdf_path) {
    version_info <- str_extract(basename(pdf_path), regex("v[0-9]+\\.[0-9]+", ignore_case = TRUE)) %>%
        str_remove(regex("^v", ignore_case = TRUE))
    protocol_name <- str_remove(basename(pdf_path), "\\.pdf$") %>%
        str_remove(regex("v[0-9]+\\.[0-9]+$", ignore_case = TRUE)) %>%
        str_remove("PRT$") %>%
        str_trim()
    list(
        protocol_name = protocol_name,
        version_info = version_info
    )
}
# PDFファイルのパスから目次と本文情報を取得
extract_pdf_info <- function(pdf_path) {
    toc_info <- pdf_toc(pdf_path)
    all_titles <- extract_titles(toc_info) %>% discard(~ .x == "")
    textByPage <- pdf_text(pdf_path)
    textList <- pdf_data(pdf_path)
    for (i in seq_along(textList)) {
        for (j in 1:2) {
            if (str_detect(textList[[i]][j, "text"], fixed(protocol_name)) ||
                str_detect(textList[[i]][j, "text"], fixed(version_info))) {
                textList[[i]][j, "text"] <- NA
            }
        }
        textList[[i]] <- textList[[i]] %>% filter(!is.na(text))
    }
    list(
        all_titles = all_titles,
        textByPage = textByPage,
        textList = textList
    )
}
make_pattern <- function(section) {
    # 章番号の末尾に必ずピリオドが付いている前提
    n <- str_count(section, "\\d+\\.") # 「数字+ピリオド」の数を数える
    paste0("^", paste0(rep("\\d+\\.", n), collapse = ""), "$")
}
# 目次情報からセクション番号、タイトル、開始ページを抽出
extract_section_page <- function(textByPage, textList) {
    # 目次開始ページ
    index_toc_start <- which(str_detect(textByPage, "目次\\n"))[1] %>% as.integer()
    index_toc_end <- which(str_detect(textByPage, "1\\. 研究計画書要旨\\n"))[1] %>% as.integer()
    indexPages <- textList[index_toc_start:index_toc_end]
    for (i in 1:length(indexPages)) {
        for (j in 1:nrow(indexPages[[i]])) {
            indexPages[[i]][j, "text"] <- indexPages[[i]][j, "text"] %>% cleaning_title()
        }
    }
    # 各ページごとにyごとにtextを結合
    indexPages_merged <- lapply(indexPages, function(df) {
        df %>%
            group_by(y) %>%
            summarise(text = paste(text, collapse = " "), .groups = "drop")
    }) %>% bind_rows()
    indexPages_merged <- indexPages_merged %>%
        mutate(
            section_number = str_extract(text, "^[0-9]+(?:\\.[0-9]+)*\\.?"),
            section_value = str_remove(text, "^[0-9]+(?:\\.[0-9]+)*\\.?") %>% str_replace("\\s[0-9]+$", "") %>% str_trim(),
            section_text = str_replace(text, "\\s[0-9]+$", ""),
            page_start = str_extract(text, "[0-9]+$")
        ) %>%
        select("section_number", "section_value", "section_text", "page_start")
    section_page <- indexPages_merged %>%
        filter(!is.na(page_start)) %>%
        filter(!is.na(section_number)) %>%
        filter(!is.na(section_value) & section_value != "")
    for (i in 1:(nrow(section_page) - 1)) {
        search_regex <- make_pattern(section_page[i, "section_number"])
        section_page[i, "page_end"] <- NA
        target <- NULL
        for (j in (i + 1):nrow(section_page)) {
            if (str_detect(section_page[j, "section_number"], regex(paste0("^", search_regex), ignore_case = TRUE))) {
                target <- section_page[j, ]
                if (section_page[j, "page_start"] == section_page[i, "page_start"]) {
                    section_page[i, "page_end"] <- section_page[i, "page_start"]
                    break
                }
                section_page[i, "page_end"] <- resolve_section_page_number(target, search_regex)
                break
            } else {
                if (j == nrow(section_page)) {
                    target <- section_page[i + 1, ]
                    section_page[i, "page_end"] <- resolve_section_page_number(target, search_regex)
                }
            }
        }
    }
    return(section_page)
}
resolve_section_page_number <- function(target, search_regex) {
    next_section_page_number <- target["page_start"] %>% as.integer()
    next_section_page <- textList[[next_section_page_number]]
    search_regex_start <- search_regex %>% str_remove("\\$$")
    next_section_page_line_1 <- next_section_page[1, "text"]
    if (str_detect(next_section_page_line_1, search_regex_start)) {
        res <-
            {
                next_section_page_number - 1
            } %>% as.character()
    } else {
        res <- next_section_page_number %>% as.character()
    }
    return(res)
}
# セクション番号とタイトルのペアリストをもとに、セクション番号、タイトル、開始ページを抽出する関数
extract_section_pairs_info <- function(section_page) {
    target_titles <- map_chr(section_pairs, 2)
    section_pairs_df <- tibble(
        section_pair_title = map_chr(section_pairs, 2),
        section_pair_number = map_chr(section_pairs, 1)
    )
    filtered_section_page <- section_page %>%
        filter(section_value %in% target_titles)
    result <- section_pairs_df %>%
        left_join(filtered_section_page, by = c("section_pair_title" = "section_value"))
    result$page_start_end <- ifelse(result$page_start == result$page_end,
        as.character(result$page_start),
        paste0(result$page_start, "〜", result$page_end)
    )
    result$output_text <- ifelse(!is.na(result$page_start),
        paste0(result$section_text, "(研究計画書 Version ", version_info, " p.", result$page_start_end, ")　参照"),
        "該当なし"
    )
    return(result)
}
get_spreadsheet <- function(spreadsheet_id) {
    tryCatch(
        {
            sheet <- gs4_get(spreadsheet_id)
        },
        error = function(e) {
            sheet <- create_spreadsheet()
        }
    )
    return(sheet)
}
create_spreadsheet <- function() {
    today_str <- format(Sys.Date(), "%Y%m%d_")
    sheet_name <- paste0(today_str, protocol_name, "_", version_info, "_プロトコル情報抽出")
    sheet <- gs4_create(sheet_name, sheets = kSheetName)
    # config.jsonにIDを書き込む
    config$output_spreadsheet_id <- sheet %>%
        gs4_get() %>%
        .$spreadsheet_id
    write_json(config, here("src/R/config.json"), auto_unbox = TRUE, pretty = TRUE)
    message("新規スプレッドシートを作成し、config.jsonにIDを書き込みました: ", config$output_spreadsheet_id)
    return(sheet)
}
# 表紙情報の取得
get_cover_info <- function() {
    cover_info <- strsplit(textByPage[1], "\n{2,}")[[1]]
    cover_info <- gsub("\n +", "\n", cover_info)
    cover_info <- gsub("\n", "", cover_info)
    cover_info <- trimws(cover_info)
    df <- tibble(
        section_pair_number = "表紙情報",
        output_text = cover_info
    )
    return(df)
}
