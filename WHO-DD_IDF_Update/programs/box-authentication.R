#' box authentication
#' 
#' @file box-authentication.R
#' @author Mariko Ohtsuka
#' @date 2025.9.9
rm(list=ls())
# ------ libraries ------
# https://github.com/cloudyr/aws.s3/issues/354
# の回避のため開発版をインストールする
if (!requireNamespace("aws.s3", quietly=T)) {
  install.packages("aws.s3", repos = c("https://RForge.net", "https://cloud.R-project.org"))
}
if (!requireNamespace("httpuv", quietly = TRUE)) {
  install.packages("httpuv")
}

library(here)
# ------ constants ------
# ------ functions ------
source(here("programs", "functions", "common.R"),  encoding="UTF-8")
# ------ main ------
### Box authenticate ###
options(httr_oob_default = FALSE)
BoxAuth()
