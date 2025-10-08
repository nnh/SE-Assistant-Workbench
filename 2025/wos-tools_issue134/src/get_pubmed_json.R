/*
Copyright 2023 Google LLC

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/
rm(list = ls())
library(jsonlite)
library(dplyr)
library(httr)
library(xml2)

# 対象のPubMed ID
pmids <- c(
  39702011, 39659746, 39624677, 39711579, 39669335, 39427990, 39282615, 39351981,
  38866416, 39403200, 39289234, 39233094, 39391712, 39350867, 39192314, 39177840,
  39314581, 39109531, 39056346, 39009112, 39202023, 38972535, 39048743, 39105024,
  38936898, 38936175, 38916909, 38973135, 38874432, 38365064, 38346670, 38807065,
  38783052, 38894773, 38749592, 38745864, 38765657, 38962405, 38962422, 38681076,
  38651188, 38640569, 38627520, 38600739, 38551778, 38520973, 39229548, 38445509,
  38389505, 38252703, 38410527, 37344425, 38868783, 38220196, 39231661, 37952958,
  38098205, 37537887, 37289506
) %>% unique()

# 保存先ディレクトリ
save_dir <- file.path("/Users/mariko/Downloads", "pubmed_json")
if (!dir.exists(save_dir)) dir.create(save_dir)

# PMIDを100件ずつに分割
pmid_chunks <- split(pmids, ceiling(seq_along(pmids)/100))

all_results <- list()

for (chunk in pmid_chunks) {
  id_list <- paste(chunk, collapse = ",")
  
  ## 1. esummary で基本情報取得
  esummary_url <- paste0(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=",
    id_list, "&retmode=json"
  )
  esum <- fromJSON(esummary_url)$result
  esum$uids <- NULL
  
  ## 2. efetch で著者の affiliation を取得
  efetch_url <- paste0(
    "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=",
    id_list, "&retmode=xml"
  )
  res <- GET(efetch_url)
  xml <- read_xml(content(res, "text", encoding = "UTF-8"))
  articles <- xml_find_all(xml, ".//PubmedArticle")
  
  for (article in articles) {
    pmid <- xml_text(xml_find_first(article, ".//PMID"))
    
    # 著者名と所属
    authors <- xml_find_all(article, ".//Author")
    author_list <- lapply(authors, function(a) {
      lname <- xml_text(xml_find_first(a, "LastName"))
      fname <- xml_text(xml_find_first(a, "ForeName"))
      affiliation <- xml_text(xml_find_first(a, "AffiliationInfo/Affiliation"))
      list(
        name = paste(fname, lname),
        affiliation = affiliation
      )
    })
    
    # esummary の基本情報に authors を追加
    if (!is.null(esum[[pmid]])) {
      esum[[pmid]]$authors <- author_list
      all_results[[pmid]] <- esum[[pmid]]
    }
  }
}

# JSON に保存
file_path <- file.path(save_dir, "pmid.json")
write_json(all_results, path = file_path, pretty = TRUE, auto_unbox = TRUE)

message("🎉 すべてのPubMedデータ（著者の所属付き）を pmid.json に保存しました: ", file_path)
