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
kNhoStr1 <- "(?i)National Hospital Organization"
kNhoStr2 <- "(?i)NHO"
# ------ functions ------
GetPubmedDataList <- function(pmid_list){
  url <- str_c("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=",
  pmid_list,
  "&retmode=xml")
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
  return(pubmed_data_list)
}
GetHtmlByFacilityAll <- function(){
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
  return(html_by_facility_all)
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
pubmed_data_list <- GetPubmedDataList("34974477,35903205,35785888,35978918,35840339,35805823,35780170,35738583,35312785,36039463,35599545,36381670,35775567,36361791,36288975,36467545,36497168,36762780")
df_pubmed_data <- pubmed_data_list %>% bind_rows()
df_pubmed_data_mito <- df_pubmed_data %>% filter(str_detect(facility, "(?i)Mito"))
# 指摘のあったPMIDに存在する水戸協同病院の著者
df_univ_tsukuba <- df_pubmed_data_mito %>% filter(str_detect(facility, "(?i)univ"))
# 指摘のあったPMIDに存在する水戸医療センターの著者
df_nho_mito <- df_pubmed_data_mito %>% filter(str_detect(facility, kNhoStr1) | str_detect(facility, kNhoStr2))
# HTMLデータの取得
html_by_facility_all <- GetHtmlByFacilityAll()
# テスト用、htmlファイルに存在するPMIDを追加
pubmed_data_list_for_check_exists <- pubmed_data_list %>% append(list(list(pmid="35191330")))
# 水戸協同病院のみの論文が出力されていなければTRUE, 最後のレコードはテスト用なので必ずFALSEになる
# 最後以外が全てTRUEならOK
check_univ_tsukuba <- pubmed_data_list_for_check_exists %>% map( ~ {
  pmid <- .$pmid %>% unique()
  return(!str_detect(html_by_facility_all , pmid))
})
# 水戸医療センターの著者を含む論文が出力されていればTRUE, 全てTRUEならOK
check_mito_med_ctr <- df_nho_mito$pmid %>% unique() %>% map( ~ str_detect(html_by_facility_all, .)) %>% unlist()
# 水戸医療センターhtmlファイル内のPMIDを抽出
pmid_matches <- str_extract_all(html_by_facility_all, "(?<=\\>)\\d{8}(?=\\<)") %>% unlist() %>% paste(collapse=",")
# 該当するPMIDの情報をPubMedから取得
pubmed_data_list_mito_med_ctr <- pmid_matches %>% GetPubmedDataList()
df_pubmed_data_mito_med_ctr <- pubmed_data_list_mito_med_ctr %>% bind_rows()
# 国立病院機構の著者を含む論文のPMID
df_pmid_mito_med_ctr_nho <- df_pubmed_data_mito_med_ctr %>%
  filter(
    str_detect(facility, "(?i)National Hospital Organization") |
    str_detect(facility, "311-3193") |
    str_detect(facility, "3113193") |
    pmid == "37267676" # WoSデータベース修正分がPubMedに反映されていないもの
  ) %>%
    select(c("pmid")) %>% distinct()
# 水戸医療センターの著者を含まない可能性のある論文のPMID
df_pmid_mito_med_ctr_not_nho <- df_pubmed_data_mito_med_ctr %>%
  anti_join(df_pmid_mito_med_ctr_nho, by="pmid")
pmid_mito_med_ctr_not_nho <- df_pmid_mito_med_ctr_not_nho %>%
  select(c("pmid")) %>% distinct()
# 水戸医療センターの著者を含まない可能性のある論文の施設情報
df_not_nho_check <- pmid_mito_med_ctr_not_nho %>%
  left_join(df_pubmed_data_mito_med_ctr, by="pmid") %>%
    filter(str_detect(facility, "(?i)Mito Medical Center")) %>%
      filter(!str_detect(facility, "(?i)University"))
