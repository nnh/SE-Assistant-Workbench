#' box authentication
#' 
#' @file box-authentication.R
#' @author Mariko Ohtsuka
#' @date 2025.9.9
rm(list=ls())
# ------ libraries ------
# aws.s3が未インストール、またはCRANに新しいバージョンがある場合はインストールする
if (!requireNamespace("aws.s3", quietly = TRUE)) {
  install.packages("aws.s3", repos = "https://cloud.R-project.org")
} else {
  old <- old.packages(repos = "https://cloud.R-project.org")
  if (!is.null(old) && "aws.s3" %in% rownames(old)) {
    install.packages("aws.s3", repos = "https://cloud.R-project.org")
  }
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
# OAuthの認証コードを手入力せず、localhost(:1410)へのリダイレクトで自動受け取りする設定
options(httr_oob_default = FALSE)
# 古い・誤った.RenvironのBOX認証情報によるinvalid_clientを避けるため、毎回client_id/secretを入力させる
BoxAuthSettings()
BoxAuth()
