library(tidyverse)

external_dict_dir <- "/Users/mariko/Library/CloudStorage/Box-Box/Stat/Tools/test20260817"
meddra_dir <- file.path(external_dict_dir, "MedDRA")

dummy_site <- tibble(
  SITEID = as.character(sample(100000000:900000000, 10)),
  SITENAME = str_c("ダミー", str_pad(1:10, width = 2, pad = "0"), "病院")
)
