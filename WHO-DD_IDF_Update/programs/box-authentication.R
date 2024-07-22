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
source(here("programs", "functions", "box-functions.R"),  encoding="UTF-8")
# ------ main ------
### Box authenticate ###
BoxAuthSettings()
BoxAuth()
