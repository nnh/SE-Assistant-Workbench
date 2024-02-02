#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(openxlsx)
library(xml2)
# ------ constants ------
kTestConstants <- NULL
# ------ functions ------
TestFunction <- function(){

}
# ------ main ------
input_xlsx_path <- here("input") %>% list.files(pattern="*.xlsx", full.names=T)
input_xlsx <- openxlsx::read.xlsx(input_xlsx_path)
target <- input_xlsx
for (i in 2:nrow(target)){
  if (is.na(target[i, "HP掲載"])){
    target[i, "HP掲載"] <- target[i - 1, "HP掲載"]
  }
}
# XMLデータの取得
url <- "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=34974477,35903205,35785888,35978918,35840339,35805823,35780170,35738583,35312785,36039463,35599545,36381670,35775567,36361791,36288975,36467545,36497168,36762780&retmode=xml"
pubmed_data <- read_xml(url)
pmid_list <- "//PubmedArticle/MedlineCitation/PMID" %>% xml_find_all(pubmed_data, .) %>% xml_text()
authorlist_list <- "//PubmedArticle/MedlineCitation/Article/AuthorList" %>% xml_find_all(pubmed_data, .)
author_data <- authorlist_list %>% map( ~ {
  authors <- xml_find_all(., "./Author")
  author_name_facility <- authors %>% map( ~ {
    author <- .
    name_facility <- list(
      name=str_c("./LastName" %>% xml_find_all(author, .) %>% xml_text(),
                 " ",
                 "./ForeName" %>% xml_find_all(author, .) %>% xml_text()),
      facility="./AffiliationInfo/Affiliation" %>% xml_find_all(author, .) %>% xml_text()
    )
    return(name_facility)
  })
  return(author_name_facility)
})
pubmed_data_list <- list()
for (i in 1:length(pmid_list)){
  pubmed_data_list[[i]] <- author_data[[i]] %>% map_df( ~ {
    return(
      list(
        pmid=pmid_list[[i]],
        name=.$name,
        facility=.$facility
      )
    )
  })
}
df_pubmed_data <- pubmed_data_list %>% bind_rows()
df_pubmed_data_mito <- df_pubmed_data %>% filter(str_detect(facility, "(?i)Mito"))
df_univ_tsukuba <- df_pubmed_data_mito %>% filter(str_detect(facility, "(?i)univ"))
df_nho <- df_pubmed_data %>% filter(str_detect(facility, "(?i)NHO"))
df_nho <- df_pubmed_data %>% filter(str_detect(facility, "(?i)Natl "))
html_parent_path <- "~/Library/CloudStorage/Box-Box/Projects/NHO 臨床研究支援部/英文論文/wos-tools/result/result_20240109174857"
html_by_facility_path <- file.path(html_parent_path, "html_by_facility")
html_by_facility_years <- html_by_facility_path %>% list.dirs(recursive=F)
html_by_facility_list <- html_by_facility_years %>% map( ~ {
  path <- .
  target_filename <- path %>% list.files() %>% str_extract("200_.*")
  target_filename <- target_filename %>% na.omit(.) %>% unlist()
  target_path <- file.path(path, target_filename)
  html_source <- target_path %>% readLines(warn=F)
  html_data <- target_path %>% read_html()
  return(list(source=html_source, data=html_data))
})
html_by_facility <- html_by_facility_list %>% map( ~ .$source) %>% list_c()
html_data_list <- html_by_facility_list %>% map( ~ {
  data <- .$data
  body <- data %>% xml_find_first("//body")
  return(body)
})
html_by_facility_all <- html_by_facility %>% paste0(collapse="")
# テスト用、htmlファイルに存在するPMIDを追加
pubmed_data_list_for_check_exists <- pubmed_data_list %>% append(list(list(pmid="35191330")))
check_exists <- pubmed_data_list_for_check_exists %>% map( ~ {
  pmid <- .$pmid %>% unique()
  if (str_detect(html_by_facility_all , pmid)){
    return(.)
  } else {
    return(NULL)
  }
})
# htmlファイル内のPMIDを抽出
pmid_matches <- str_extract_all(html_by_facility_all, "(?<=\\>)\\d{8}(?=\\<)") %>% unlist()
