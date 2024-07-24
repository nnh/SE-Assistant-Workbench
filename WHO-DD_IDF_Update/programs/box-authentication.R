#' box authentication
#' 
#' @file box-authentication.R
#' @author Mariko Ohtsuka
#' @date 2024.7.22
rm(list=ls())
# ------ libraries ------
library(here)
# ------ constants ------
# ------ functions ------
source(here("programs", "functions", "common.R"),  encoding="UTF-8")
# ------ main ------
### Box authenticate ###
BoxAuth()
