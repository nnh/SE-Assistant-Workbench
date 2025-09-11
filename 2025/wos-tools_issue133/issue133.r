rm(list = ls())
library(tidyverse)
library(here)
### functions ###
get_pm_by_ut <- function(data, ut) {
    res <- data %>%
        filter(UT == ut) %>%
        select(PM) %>%
        unlist()
    return(res)
}
get_diff_cols_by_pm <- function(data, pmid) {
    target <- data %>% filter(PM == pmid)
    diff_cols <- names(target)[apply(target, 2, function(col) length(unique(col)) > 1)]
    target_diff <- target %>% select(all_of(diff_cols))
    return(target_diff)
}

### main ###
savedrecs <- read_delim(here("savedrecs.txt"), delim = "\t")
pm_groups <- split(savedrecs, savedrecs$PM)
pm_na_records <- savedrecs %>% filter(PM == "" | is.na(PM))
duplicates <- pm_groups[sapply(pm_groups, nrow) == 2]
non_duplicates <- pm_groups[sapply(pm_groups, nrow) == 1]
non_duplicates_uids <- non_duplicates %>%
    map(~ .$UT) %>%
    flatten_chr() %>%
    unique()
# ↓non_duplicatesのレコードについて重複が解消されているため削除依頼対象外であることを確認する
######
# 38381952
# UT="WOS:001173727800001"のレコードのPM -> 38381952
"WOS:001173727800001" %>%
    get_pm_by_ut(savedrecs, .) %>%
    print()
# UT="WOS:001281450000001"のレコード -> なし
"WOS:001281450000001" %>%
    get_pm_by_ut(savedrecs, .) %>%
    print()
######
# UT="WOS:001424703700001"のレコードのPM -> 39396495
"WOS:001424703700001" %>%
    get_pm_by_ut(savedrecs, .) %>%
    print()
######
# UT="WOS:001337881100001"のレコードのPM -> 39428528
"WOS:001337881100001" %>%
    get_pm_by_ut(savedrecs, .) %>%
    print()
######
# UT="WOS:001342431900001"のレコードのPM -> 39462593
"WOS:001342431900001" %>%
    get_pm_by_ut(savedrecs, .) %>%
    print()
######
# UT="WOS:001425534900001"のレコードのPM -> 39609644
"WOS:001425534900001" %>%
    get_pm_by_ut(savedrecs, .) %>%
    print()
######
# ↑non_duplicatesのレコードについて重複が解消されているため削除依頼対象外であることを確認する

### ↓調査依頼対象となるデータは５件
target_pmid <- names(duplicates)
print(target_pmid)
count <- 0
for (pmid in target_pmid) {
    count <- count + 1
    target_diff <- get_diff_cols_by_pm(savedrecs, pmid)
    target_diff$PubmedId <- pmid
    assign(paste0("target_diff_", count), target_diff)
}
