library(rvest)
extract_wos_ids <- function(html_file_path) {
    # HTMLを読み込む
    html <- read_html(html_file_path)

    # HTML全体のテキストを取得
    text_content <- html_text(html)

    # WOS: から始まる15桁のIDをすべて抽出
    wos_ids <- str_extract_all(text_content, "WOS:\\d{15}")[[1]]

    return(wos_ids)
}
get_not_in_html <- function(records, html_uids) {
    records %>%
        filter(!uid %in% html_uids)
}
get_html_uids <- function(config) {
    html_files <- get_html_files(config)
    # htmlファイルに出力されているWOS IDを抽出する
    html_uids <- map(html_files, extract_wos_ids) %>%
        unlist() %>%
        unique()
    return(html_uids)
}
# 修正依頼中のID一覧
wos_ids_fix_requested <- c(
    "WOS:001420056300011",
    "WOS:001420056300011",
    "WOS:001420056300011",
    "WOS:001374705100019",
    "WOS:001373403100001",
    "WOS:001368639700001",
    "WOS:001362370000001",
    "WOS:001355693300001",
    "WOS:001354430800001",
    "WOS:001325064000006",
    "WOS:001325870500001",
    "WOS:001304493800012",
    "WOS:001299011500006",
    "WOS:001274078500005",
    "WOS:001267474000001",
    "WOS:001232468200001",
    "WOS:001209162900001",
    "WOS:001198678200001",
    "WOS:001184037200001",
    "WOS:001173081300001",
    "WOS:001180367800001",
    "WOS:001180367800001",
    "WOS:001180367800001",
    "WOS:001170570200001",
    "WOS:001137577900001",
    "WOS:001137577900001",
    "WOS:001137577900001",
    "WOS:001137577900001",
    "WOS:001137577900001",
    "WOS:001137577900001",
    "WOS:001137577900001",
    "WOS:001101929300001",
    "WOS:001429215100001"
) %>% unique()
# 対象外の既知のWoS ID
excluded_known_wos_ids <- c(
    "WOS:001384446000001",
    "WOS:001372932100001",
    "WOS:001358380900001",
    "WOS:001257412600001",
    "WOS:001236962600001",
    "WOS:001199433100001",
    "WOS:001151350800001",
    "WOS:001425442100001"
) %>% unique()
