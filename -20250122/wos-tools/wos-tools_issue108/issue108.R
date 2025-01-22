#' wos-tools issue108
#'
#' @file issue108.R
#' @author Mariko Ohtsuka
#' @date 2024.3.1
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(jsonlite)
# ------ constants ------
kInputRawJson <- "~/Library/CloudStorage/Box-Box/Projects/NHO 臨床研究支援部/英文論文/wos-tools/result/result_20240109174857/raw/raw.json"
# ------ functions ------
# ------ main ------
raw_json <- kInputRawJson |> jsonlite::read_json()
rec <- raw_json |> map( ~ .$Data$Records$records$REC)
identifier <- rec %>% map_df( ~ {
  rec1 <- .
  rec2 <- rec1 %>% map_df( ~ {
    identifier <- .$dynamic_data$cluster_related$identifiers$identifier
    if (!is.null(names(identifier))){
      df_identifier <- identifier |> as_tibble()
    } else {
      df_identifier <- identifier |> map_df( ~ as_tibble(.))
    }
    pmid <- df_identifier |> filter(type == "pmid")
    if (length(pmid) == 0){
      pmid <- tibble(type="pmid", value=NA)
    }
    pmid$uid <- .$UID
    return(pmid)
  })
  return(rec2)
})
identifier$pmid <- identifier$value %>% str_remove("MEDLINE:")
target_pmid <- c(38314035,
                 38223272,
                 38148752,
                 38081735,
                 37832759,
                 36200417) #  36200417はDummy,ホームページに存在するPMID

test <- target_pmid %>% map( ~ filter(identifier, pmid == .))
