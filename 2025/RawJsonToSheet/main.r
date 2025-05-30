rm(list = ls())
source("common.r")
source("addresses.r")
source("getHtml.r")
source("getNhoRec.r")
source("publishers.r")
source("pubmed.r")

if (!file.exists("rec.RData")) {
    rec <- get_rec(config)
    print("recを取得しました")
    save(rec, file = "rec.RData")
}
load("rec.RData")
# htmlファイルを取得する
if (!file.exists("html_uids.RData")) {
    html_uids <- get_html_uids(config)
    html_uids <- append(html_uids, wos_ids_fix_requested) %>% append(., excluded_known_wos_ids)
    print("html_uidsを取得しました")
    save(html_uids, file = "html_uids.RData")
}
load("html_uids.RData")
# addressesを取得する
if (!file.exists("address_data.RData")) {
    address_data <- get_address_data(rec)
    print("address_dataを取得しました")
    save(address_data, file = "address_data.RData")
}
load("address_data.RData")
# ジャーナル情報の取得
if (!file.exists("publish_data.RData")) {
    publish_data <- get_publish_data(rec)
    print("publish_dataを取得しました")
    save(publish_data, file = "publish_data.RData")
}
load("publish_data.RData")

# 対象の施設名らしき文字列が入っていて、htmlファイルに出力されていないもの
nho_not_in_html <- get_nho_not_in_html(address_data, html_uids, hospital_pattern)
View(nho_not_in_html)
# 施設名の修正が必要なものを抽出
fix_targets <- nho_not_in_html %>%
    filter(
        !str_detect(forcheck_ad, hospital_pattern) &
            !str_detect(forcheck_oo, hospital_pattern)
    )
View(fix_targets)
fix_targets_wos_ids <- fix_targets$uid %>% unique()

publish_data_fix_targets <- publish_data %>%
    filter(UID %in% fix_targets_wos_ids)
View(publish_data_fix_targets)
pmid_list <- publish_data_fix_targets$pmid %>%
    na.omit() %>%
    unique()

# PubMed IDのリストを取得
if (!file.exists("pmid_list.RData")) {
    stop("pmid_list.RDataが存在しません。pubmed.Rでdownload_pubmed_xml()を実行し、pmid_listを作成してください。")
} else {
    load("pmid_list.RData")
}
