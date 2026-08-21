library(tidyverse)

external_dict_dir <- "/Users/mariko/Library/CloudStorage/Box-Box/Stat/Tools/test20260817"
meddra_dir <- file.path(external_dict_dir, "MedDRA")

who_drug_idf_parent_dir <- file.path(external_dict_dir, "WHO-DD_IDF")
who_drug_idf_version_folder <- "2025 Mar 1"

dummy_site <- tibble(
  SITEID = as.character(sample(100000000:900000000, 10)),
  SITENAME = str_c("ダミー", str_pad(1:10, width = 2, pad = "0"), "病院")
)
