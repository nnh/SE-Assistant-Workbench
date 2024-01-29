#' wos-tools issue101
#'
#' @file issue101.R
#' @author Mariko Ohtsuka
#' @date 2024.1.29
rm(list=ls())
# ------ libraries ------
library(tidyverse)
# ------ constants ------
kInputPath <- "~/Library/CloudStorage/Box-Box/Datacenter/Users/ohtsuka/2023/20240129/input"
# ------ functions ------
ReadAllTextFiles <- function(directory_path) {
  text_files <- list.files(directory_path, pattern = "\\.txt$", full.names = TRUE)
  if (length(text_files) == 0) {
    warning("No text files found in the specified directory.")
    return(NULL)
  }
  file_contents <- map_df(text_files, ~ tibble(content = readLines(.)))

  return(file_contents)
}
GetDiff <- function(df1, df2) {
  key_column = "content"
  diff_result <- anti_join(df1, df2, by = key_column) %>%
    bind_rows(anti_join(df2, df1, by = key_column))

  # Column added to indicate which data frame the difference is in.
  diff_result <- diff_result %>%
    mutate(in_df1_only = ifelse(row_number() <= nrow(df1), TRUE, FALSE),
           in_df2_only = ifelse(row_number() > nrow(df1), TRUE, FALSE))
  contents <- diff_result[ , "content"]
  contents_header <- df1[1, , drop=T] %>% str_split("\t") %>% .[[1]]
  contents <- contents %>% separate(content, contents_header, "\t")
  return(list(diff_result=diff_result, content=contents))
}
# ------ main ------
target_years <- c(2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023) %>% as.character()
diff_list <- target_years %>% map( ~ {
  target_year <- .
  before_text <- file.path(kInputPath, target_year, "bef") %>% ReadAllTextFiles()
  after_text <- file.path(kInputPath, target_year, "aft") %>% ReadAllTextFiles()
  res <- GetDiff(before_text, after_text)
  content <- res$content
  diff_result <- res$diff_result
  content$target_year <- target_year
  diff_result$target_year <- target_year
  return(list(diff_result=diff_result, content=content))
})
names(diff_list) <- target_years
# Check whether any records are being retrieved only by the modified query.
df_diff <- diff_list %>% map_df( ~ .$diff_result)
# If both are TRUE, there are no records in the output from the modified query only.
test1 <- all((df_diff$in_df1_only))
test2 <- !all((df_diff$in_df2_only))
# Check facility information on records that are no longer retrieved after modification.
df_contents <- diff_list %>% map_df( ~ .$content)
kNHO_1 <- "NATL HOSP ORG.*$"
nho_1_c1 <- df_contents %>% filter(str_detect(toupper(C1), kNHO_1))
nho_1_c3 <- df_contents %>% filter(str_detect(toupper(C3), kNHO_1))
nho_1_rp <- df_contents %>% filter(str_detect(toupper(RP), kNHO_1))
test3 <- nrow(nho_1_c1) == 0 && nrow(nho_1_c3) == 0 && nrow(nho_1_rp) == 0
kNHO_2 <- "NHO .*$"
nho_2_c1 <- df_contents %>% filter(str_detect(toupper(C1), kNHO_2))
nho_2_c3 <- df_contents %>% filter(str_detect(toupper(C3), kNHO_2))
nho_2_rp <- df_contents %>% filter(str_detect(toupper(RP), kNHO_2))
nho_c1 <- toupper(nho_2_c1$C1) %>% str_extract_all("NHO .{4}") %>% unlist() %>% unique()
nho_c3 <- toupper(nho_2_c1$C3) %>% str_extract_all("NHO .{4}") %>% unlist() %>% unique()
nho_rp <- toupper(nho_2_c1$RP) %>% str_extract_all("NHO .{4}") %>% unlist() %>% unique()
test4 <- nho_c1 == "NHO QUAN" && length(nho_c3) == 0 && nho_rp == "NHO QUAN"
if (all(test1, test2, test3, test4)) {
  print("test ok.")
} else {
  print("test ng.")
}
