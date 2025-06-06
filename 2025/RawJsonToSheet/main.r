rm(list = ls())
source("common.r")
source("addresses.r")
source("getHtml.r")
source("getNhoRec.r")
source("publishers.r")
source("pubmed.r")

# --- functions ---
load_or_get <- function(object_name, get_function) {
    filename <- str_c(object_name, ".RData")
    target_path <- file.path(data_path, filename)

    if (!file.exists(target_path)) {
        assign(object_name, get_function())
        print(str_c(object_name, "を取得しました"))
        save(object_name, list = object_name, file = target_path)
    }
    load(target_path, envir = .GlobalEnv)
    return(NULL)
}
# --- main ---
dummy <- load_or_get(
    object_name = "rec",
    get_function = function() get_rec(config)
)
dummy <- load_or_get(
    object_name = "html_uids",
    get_function = function() {
        html_uids <- get_html_uids(config)
        html_uids <- append(html_uids, wos_ids_fix_requested) %>%
            append(., excluded_known_wos_ids)
        return(html_uids)
    }
)
dummy <- load_or_get(
    object_name = "address_data",
    get_function = function() get_address_data(rec)
)
dummy <- load_or_get(
    object_name = "publish_data",
    get_function = function() get_publish_data(rec)
)

# 対象の施設名らしき文字列が入っていて、htmlファイルに出力されていないもの
nho_not_in_html <- get_nho_not_in_html(address_data, html_uids, hospital_pattern)
# View(nho_not_in_html)
# 施設名の修正が必要なものを抽出
fix_targets <- nho_not_in_html %>%
    filter(
        !str_detect(forcheck_ad, hospital_pattern) &
            !str_detect(forcheck_oo, hospital_pattern)
    )
# View(fix_targets)
fix_targets_wos_ids <- fix_targets$uid %>% unique()

publish_data_fix_targets <- publish_data %>%
    filter(UID %in% fix_targets_wos_ids)
# View(publish_data_fix_targets)
pmid_list <- publish_data_fix_targets$pmid %>%
    na.omit() %>%
    unique()

# PubMed IDのリストを取得
pubmed_xml_list <- get_target_pubmed_files()
if (is.null(pubmed_xml_list)) {
    stop("pmid_list.RDataが存在しません。pmid_listオブジェクトの内容を確認してから、download_pubmed.Rでdownload_pubmed_xml()を実行してください。")
} else {
    pubmed_data <- fetch_pubmed_data()
}

output_df <- fix_targets %>%
    left_join(
        publish_data_fix_targets,
        by = c("uid" = "UID")
    ) %>%
    select(
        uid, addr_no, full_name, full_address, organization,
        doi, eissn, pmid, journal_title, publisher_name
    ) %>%
    left_join(
        pubmed_data,
        by = c("pmid" = "PubMedID", "full_name" = "Author"), relationship = "many-to-many"
    )
output_df <- output_df %>%
    filter(is.na(DEP_Year) | DEP_Year >= 2022)
output_df <- output_df %>%
    filter(!is.na(DEP_Month) | !is.na(DP_Month))
cols <- c(
    "uid", "pmid", "full_name", "full_address", "organization", "Affiliation",
    "doi", "eissn", "journal_title", "publisher_name",
    "DP_Year", "DP_Month", "DEP_Year", "DEP_Month", "Volume", "Issue",
    "ArticleTitle", "addr_no"
)
output_df <- output_df %>% select(all_of(cols))

googlesheets4::write_sheet(
    output_df,
    ss = config$spreadsheet_id,
    sheet = config$sheet_name
)
