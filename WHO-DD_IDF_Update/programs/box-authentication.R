#' box authentication
#' 
#' @file box-authentication.R
#' @author Mariko Ohtsuka
#' @date 2024.8.8
rm(list=ls())
# ------ libraries ------
# https://github.com/cloudyr/aws.s3/issues/354
# の回避のため開発版をインストールする
if (!requireNamespace("aws.s3", quietly=T)) {
  install.packages("aws.s3", repos = c("https://RForge.net", "https://cloud.R-project.org"))
}
library(here)
# ------ constants ------
# ------ functions ------
source(here("programs", "functions", "common.R"),  encoding="UTF-8")
# ------ main ------
### Box authenticate ###
BoxAuth()
