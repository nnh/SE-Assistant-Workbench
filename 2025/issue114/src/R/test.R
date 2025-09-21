library(tidyverse)
library(pdftools)
# 再帰的に title を集める関数
extract_titles <- function(x) {
    titles <- character(0)

    if (is.list(x)) {
        # title 要素があれば追加
        if (!is.null(x$title)) {
            titles <- c(titles, x$title)
        }
        # children があれば再帰呼び出し
        if (!is.null(x$children) && is.list(x$children)) {
            child_titles <- unlist(lapply(x$children, extract_titles))
            titles <- c(titles, child_titles)
        }
    }

    return(titles)
}

# PDFファイルのパスを指定
pdf_path <- "/Users/mariko/Downloads/TORG-Osimertinib-NSCLC PRTv6.0.pdf"

# ファイル名からバージョン情報を取得
version_info <- str_extract(basename(pdf_path), regex("v[0-9]+\\.[0-9]+", ignore_case = TRUE)) %>% str_remove(regex("^v", ignore_case = TRUE))

# PDFの目次情報を取得
toc_info <- pdf_toc(pdf_path)
all_titles <- extract_titles(toc_info) %>% discard(~ .x == "")

textByPage <- pdf_text(pdf_path)
textList <- pdf_data(pdf_path)
# 目次開始ページ
index_toc_start <- which(str_detect(textByPage, "目次\\n"))[1] %>% as.integer()
index_toc_end <- which(str_detect(textByPage, "1\\. 研究計画書要旨\\n"))[1] %>% as.integer()
indexPages <- textList[index_toc_start:index_toc_end]
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
    filter(!is.na(section_value))
# セクション番号とタイトルのペアリストをリテラルで作成
section_pairs <- list(
    list("4. 略号及び用語の定義一覧", "略語・用語"),
    list("5.1. 試験審査委員会（IRB）", "規制要件と倫理"),
    list("5.2. 試験の倫理的実施", "試験管理"),
    list("5.3. 被験者への情報および同意", "説明と同意"),
    list("6. 研究責任医師等及び試験管理組織", "実施体制"),
    list("7. 諸言", "実施の根拠"),
    list("8. 試験の目的", "概要"),
    list("9.1. 試験の全般的デザイン及び計画−記述", "根拠"),
    list("9.2. 対照群の選択を含む試験デザインについての考察", "ベネフィット・リスク評価"),
    list("9.2. 対照群の選択を含む試験デザインについての考察", "目的および評価項目"),
    list("9.3.1 選択基準", "選択基準"),
    list("9.3.2 除外基準", "除外基準"),
    list("9.3.3. 患者の治療又は評価の打ち切り", "治療"),
    list("9.4.1 治療法", "投与スケジュール"),
    list("9.4.2. 試験薬の同定", "試験薬の同定"),
    list("9.4.3. 試験群への患者の割り付け方法", "症例登録、層別化および割付"),
    list("9.4.4. 試験における用量の選択", "試験薬"),
    list("9.4.5. 各患者の用量の選択及び投与時期", "治療群及び治療期間")
)
# section_pairs の2番目の要素（タイトル）に一致する section_value を持つレコードを抽出し、存在しない場合は空のレコードを返す
target_titles <- map_chr(section_pairs, 2)

# section_pairsをデータフレーム化
section_pairs_df <- tibble(
    section_pair_title = map_chr(section_pairs, 2),
    section_pair_number = map_chr(section_pairs, 1)
)

# section_pageから該当レコード抽出
filtered_section_page <- section_page %>%
    filter(section_value %in% target_titles)

# section_pairs_dfとfiltered_section_pageを結合（left_joinで常にsection_pairsの情報を保持）
result <- section_pairs_df %>%
    left_join(filtered_section_page, by = c("section_pair_title" = "section_value"))
