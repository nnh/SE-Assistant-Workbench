get_nho_not_in_html <- function(address_data, html_uids, hospital_pattern) {
    # full_addressまたは organizationsに"natl hosp org"または"nho"が含まれていたら国立病院機構
    nho_records <- address_data %>%
        filter(
            str_detect(forcheck_ad, "natl hosp org|nho") |
                str_detect(forcheck_oo, "natl hosp org|nho") |
                str_detect(forcheck_ad, hospital_pattern) |
                str_detect(forcheck_oo, hospital_pattern)
        )

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
        "kyusyu canc ctr",
        "kyusyu med ctr",
        "higashi nagoya natl hosp",
        "higashi owari natl hosp"
    ) %>%
        str_c(collapse = "|") %>%
        str_to_lower()

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
    return(nho_not_in_html)
}
