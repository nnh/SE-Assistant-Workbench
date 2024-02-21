#' title
#' description
#' @file crc-nnh-go-jp-migration.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(rvest)
source(here("constants_and_functions.R"), encoding="utf-8")
# ------ main ------
filelist_html <- kInputPath |> list.files(pattern = "*.html", full.names=T, recursive=T)
index <- grep("/wp-json/", filelist_html)
filelist_html <- filelist_html[-index]
filenames <- filelist_html |> str_remove(str_c(kInputPath, "/")) %>% str_replace_all("/", "_")
files <- filelist_html |> map_df( ~ ReadHtml(.)) |> filter(!is.na(input_path))
df <- files |> EditText()
unique_links <- df |> filter(str_detect(url, "^/.*/$")) %>% .$url |> unique()
unique_links <- kRoot |> c(unique_links)
unique_links_names <- unique_links %>% map_vec( ~ {
  link_name <- . |> str_replace("-", "_")
  if (link_name == kRoot) {
    link_name <- "top"
  }
  return(link_name)
})
pages <- unique_links |> map( ~ {
  target_path <- str_c(kInputPath, ., kIndexHtml)
  page <- df |> filter(input_path == target_path)
  return(page)
})
names(pages) <- unique_links_names
