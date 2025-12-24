library(tidyverse)

all_folders <- list.dirs(
    path = "C:\\Users\\MarikoOhtsuka\\Documents\\GitHub\\ptosh-json-to-excel\\output",
    full.names = FALSE,
    recursive = FALSE
)

target_trials <- c("Bev-FOLFOX-SBC", "AML224-FLT3-ITD", "ALL-B19")
target_trials <- c("AML224-FLT3-ITD")
target_folders <- list()

for (trial in target_trials) {
    trial_folders <- all_folders[str_detect(all_folders, trial)]

    pattern <- str_c("(?<=output_)\\d+(?=", trial, "$)")

    latest_folder <- trial_folders[
        which.max(as.numeric(str_extract(trial_folders, pattern)))
    ]
    target_folders <- c(target_folders, latest_folder)
}
names(target_folders) <- target_trials
