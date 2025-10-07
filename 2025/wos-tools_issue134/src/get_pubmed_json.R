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
# 必要なパッケージの読み込み
library(jsonlite)
library(dplyr)
# 対象のPubMed ID（PMID）のベクトル
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

# 保存先ディレクトリの指定
save_dir <- file.path("/Users/mariko/Downloads", "pubmed_json")
if (!dir.exists(save_dir)) {
    dir.create(save_dir)
}
# PMIDを100件ずつに分割
pmid_chunks <- split(pmids, ceiling(seq_along(pmids) / 100))

# 結果をまとめるリスト
all_results <- list()

# 各チャンクごとに取得
for (chunk in pmid_chunks) {
  id_list <- paste(chunk, collapse = ",")
  url <- paste0("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&id=", id_list, "&retmode=json")
  response <- fromJSON(url)

  # 結果をリストに追加
  all_results <- c(all_results, response$result)
}

# 不要な "uids" 要素を削除（あれば）
all_results$uids <- NULL

# ファイル名
file_path <- file.path(save_dir, paste0("pmid.json"))

# 1つのJSONファイルとして保存
write_json(all_results, path = file_path, pretty = TRUE, auto_unbox = TRUE)

message("🎉 すべてのPubMedデータを1つのJSONファイルに保存しました: ", file_path)
