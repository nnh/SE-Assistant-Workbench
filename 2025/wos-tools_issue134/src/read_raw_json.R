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
library(tidyverse)
rawJson <- jsonlite::read_json("/Users/mariko/Downloads/cpy.raw.json")
rec <- rawJson %>%
    map(~ .[["Data"]][["Records"]][["records"]][["REC"]]) %>%
    flatten()
uids <- rec %>%
    map_chr(~ .[["UID"]])
target_uids <- c(
  "WOS:001492944500036",
  "WOS:001472196600010",
  "WOS:001253422300001",
  "WOS:001252588100001",
  "WOS:001476878100016",
  "WOS:001490513700008",
  "WOS:001526826000003",
  "WOS:001526826000006",
  "WOS:001206355700001",
  "WOS:001200552800001",
  "WOS:001215740900001",
  "WOS:001183950500001",
  "WOS:001179165100001",
  "WOS:001157696000001",
  "WOS:001164609700001",
  "WOS:001505211700003",
  "WOS:001040584800001",
  "WOS:001243347800007"
)
exists_in_uids <- target_uids %in% uids
names(exists_in_uids) <- target_uids
uids_exist <- target_uids[exists_in_uids]
uids_not_exist <- target_uids[!exists_in_uids]
print("raw.jsonに存在しないUID：")
print(uids_not_exist)
# "WOS:001183950500001"
for (i in 1:length(rec)) {
    if (rec[[i]][["UID"]] == "WOS:001183950500001") {
        target001183950500001 <- print(rec[[i]])
        break
    }
}
# WOS:001490513700008
for (i in 1:length(rec)) {
    if (rec[[i]][["UID"]] == "WOS:001490513700008") {
        target001490513700008 <- print(rec[[i]])
        break
    }
}