source("common.r")
library(rvest)
# --- functions ---
get_names_names <- function(addresses) {
    if (addresses$count == 1) {
        address_names <- list(addresses$address_name)
    } else {
        address_names <- addresses$address_name
    }
    res <- address_names %>%
        map(~ {
            address_name <- .x
            names <- address_name$names
            if (is.null(names)) {
                return(NULL)
            }
            res <- get_names_name(names)
            return(res)
        }) %>%
        bind_rows()
}
get_names_name <- function(names) {
    if (is.null(names)) {
        return(NULL)
    }
    if (names$count == 1) {
        nameList <- list(names$name)
    } else {
        nameList <- names$name
    }
    res <- nameList %>%
        map(~ {
            name <- .x
            addr_no <- name$addr_no
            full_name <- name$full_name
            tibble(addr_no = addr_no, full_name = full_name)
        }) %>%
        bind_rows()
    return(res)
}
get_address_specs <- function(addresses) {
    if (addresses$count == 1) {
        address_names <- list(addresses$address_name)
    } else {
        address_names <- addresses$address_name
    }
    res <- address_names %>%
        map(~ {
            address_name <- .x
            address_spec <- address_name$address_spec
            if (is.null(address_spec)) {
                return(NULL)
            }
            res <- get_address_spec(address_spec)
            return(res)
        }) %>%
        bind_rows()
    return(res)
}
get_address_spec <- function(address_spec) {
    country <- address_spec$country
    addr_no <- address_spec$addr_no
    organizations <- address_spec$organizations
    organizations_df <- map_dfr(organizations$organization, ~ {
        tibble(
            organization = .x$content
        )
    })
    full_address <- address_spec$full_address
    address <- tibble(
        country = country,
        addr_no = addr_no,
        full_address = full_address
    )
    if (!is.null(organizations_df)) {
        address <- bind_cols(address, organizations_df)
    }
    res <- address %>% filter(country == "Japan")
    return(res)
}
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
exclude_institution <- function(df, institution_pattern) {
    df %>%
        filter(
            !str_detect(forcheck_ad, institution_pattern) &
                !str_detect(forcheck_oo, institution_pattern)
        )
}
get_unique_nho_not_in_html <- function(nho_not_in_html) {
    unique_nho_not_in_html <- nho_not_in_html %>%
        select(full_address, organization, uid) %>%
        distinct()
    return(unique_nho_not_in_html)
}

# --- main ---
rec <- get_rec(config)
address_data_list <- rec %>%
    map(~ {
        rec_list <- .x
        record_list <- rec_list %>%
            map(~ {
                record <- .x
                uid <- record$UID
                static_data <- record$static_data
                fullrecord_metadata <- static_data$fullrecord_metadata
                addresses <- fullrecord_metadata$addresses
                count <- addresses$count
                names <- get_names_names(addresses)
                address_specs <- get_address_specs(addresses)
                if (is.null(address_specs)) {
                    return(NULL)
                }
                if (is.null(names)) {
                    names <- tibble(addr_no = address_specs$addr_no, full_name = NA)
                }
                res <- inner_join(address_specs, names, by = "addr_no", relationship = "many-to-many")
                res$uid <- uid
                return(res)
            }) %>%
            bind_rows()
        return(record_list)
    })
address_data <- NULL
for (i in seq_along(address_data_list)) {
    if (is.null(address_data_list[[i]])) {
        next
    }
    if (length(address_data_list[[i]]) == 0) {
        next
    }
    address_data <- bind_rows(address_data, address_data_list[[i]])
}
address_data$forcheck_ad <- str_to_lower(address_data$full_address)
address_data$forcheck_oo <- str_to_lower(address_data$organization)
hospital_pattern <- str_c(hospitals, collapse = "|") %>% str_to_lower()
# full_addressまたは organizationsに"natl hosp org"または"nho"が含まれていたら国立病院機構
nho_records <- address_data %>%
    filter(
        str_detect(forcheck_ad, "natl hosp org|nho") |
            str_detect(forcheck_oo, "natl hosp org|nho") |
            str_detect(forcheck_ad, hospital_pattern) |
            str_detect(forcheck_oo, hospital_pattern)
    )
# htmlファイルを取得する
html_files <- get_html_files(config)
# htmlファイルに出力されているWOS IDを抽出する
html_uids <- map(html_files, extract_wos_ids) %>%
    unlist() %>%
    unique()
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
# クエリ修正予定の施設名
query_fix_institution <- c(
    "hirosaki gen med ctr",
    "hakodate med ctr",
    "higashiomi gen med ctr",
    "higashiohmi gen med ctr",
    "hizen psychiat ctr",
    "shimofusa psychiat ctr",
    "matsumoto natl hosp",
    "ibaraki higashi natl hosp",
    "awara natl hosp",
    "saitama natl hosp",
    "sakakibara natl hosp",
    "chiba higashi natl hosp",
    "nishi niigata chuo natl hosp",
    "tenryuu hosp",
    "fukuoka higashi med ctr",
    "kyusyu canc ctr",
    "kyusyu med ctr",
    "higashi nagoya natl hosp",
    "higashi owari natl hosp"
) %>%
    str_c(collapse = "|") %>%
    str_to_lower()
# 対象外の既知のWoS ID
excluded_known_wos_ids <- c(
    "WOS:001384446000001",
    "WOS:001372932100001",
    "WOS:001358380900001",
    "WOS:001257412600001",
    "WOS:001236962600001",
    "WOS:001199433100001",
    "WOS:001151350800001"
) %>% unique()

html_uids <- append(html_uids, wos_ids_fix_requested) %>% append(., excluded_known_wos_ids)
# html_uidsに含まれていないWoS IDを抽出
nho_not_in_html <- get_not_in_html(nho_records, html_uids)
nho_not_in_html <- exclude_institution(nho_not_in_html, "tsukuba univ")
nho_not_in_html <- exclude_institution(nho_not_in_html, "univ tsukuba")
nho_not_in_html <- exclude_institution(nho_not_in_html, "ntt tokyo med ctr")
nho_not_in_html <- exclude_institution(nho_not_in_html, "mito kyodo gen hosp")
nho_not_in_html <- nho_not_in_html %>%
    filter(
        !str_detect(forcheck_ad, query_fix_institution) &
            !str_detect(forcheck_oo, query_fix_institution)
    )
# 対象の施設名らしき文字列が入っていて、htmlファイルに出力されていないもの
View(nho_not_in_html)
unique_nho_not_in_html <- get_unique_nho_not_in_html(nho_not_in_html)
View(unique_nho_not_in_html)
# 施設名の修正が必要なものを抽出
fix_targets <- nho_not_in_html %>%
    filter(
        !str_detect(forcheck_ad, hospital_pattern) &
            !str_detect(forcheck_oo, hospital_pattern)
    )
View(fix_targets)
fix_targets_wos_ids <- fix_targets$uid %>% unique()
# ジャーナル情報の取得
publish_data <- get_publish_data(rec)
str(publish_data)
publish_data_fix_targets <- publish_data %>%
    filter(UID %in% fix_targets_wos_ids)
View(publish_data_fix_targets)
# PubMed IDのリストを取得
pmid_list <- publish_data_fix_targets$pmid %>%
    na.omit() %>%
    unique()
# 使用例
download_pubmed_xml(pmid_list)
