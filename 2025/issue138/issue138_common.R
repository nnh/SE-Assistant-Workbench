library(tidyverse)
library(jsonlite)

all_folders <- list.dirs(
    path = "C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\ptosh-json-to-excel\\output",
    full.names = FALSE,
    recursive = FALSE
)

target_trials <- c("Bev-FOLFOX-SBC", "AML224-FLT3-ITD", "ALL-B19")
target_folders <- list()
input_json_list <- list()
input_json_list[[1]] <- read_json("C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\ptosh-json-to-excel\\forTest_input_Bev-FOLFOX-SBC\\Bev-FOLFOX-SBC_250929_1501.json")
input_json_list[[2]] <- read_json("C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\ptosh-json-to-excel\\forTest_input_AML224-FLT3-ITD\\AML224-FLT3-ITD_250929_1501.json")
input_json_list[[3]] <- read_json("C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\ptosh-json-to-excel\\forTest_input_ALL-B19\\ALL-B19_250929_1452.json")


for (trial in target_trials) {
    trial_folders <- all_folders[str_detect(all_folders, trial)]
    if (length(trial_folders) == 0) {
        latest_folder <- NA
    } else {
        pattern <- str_c("(?<=output_)\\d+(?=", trial, "$)")

        latest_folder <- trial_folders[
            which.max(as.numeric(str_extract(trial_folders, pattern)))
        ]
    }

    target_folders <- c(target_folders, latest_folder)
}
names(target_folders) <- target_trials
