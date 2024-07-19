#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
Sys.setenv(PATH = paste(Sys.getenv("PATH"), "C:/Program Files/7-Zip", sep = ";"))
library(tidyverse)
library(here)
library(boxr)
library("aws.s3")
### Box authenticate ###
#kClientId <- readline(prompt = "BOXのクライアントIDを入力してEnter: ")
#kClientSecret <- readline(prompt = "BOXのクライアントシークレットを入力してEnter: ")
#box_auth(client_id = kClientId, client_secret = kClientSecret)
# ------ constants ------
kIdf <- "idf"
kWhodd <- "whodd"
kWhoddZip <- "whoddZip"
kZipDirName <- "圧縮ファイル"
kZipExtention <- ".zip"
kIdfFileNameParts <- "(?i)^mtlt2[0-9]{5}"
kIdfFileNameString <- str_c(kIdfFileNameParts, ".*", kZipExtention, "$")
kWhoddJapanCrtParts <- "(?i)^WHODrug\\sJapan\\sCRT"
# ------ functions ------
source(here("programs", "common-functions.R"),  encoding="UTF-8")
source(here("programs", "s3-functions.R"),  encoding="UTF-8")
SaveCopyIdf <- function() {
  if (!kIdf %in% names(file_list)) {
    return()
  }
  unzipDir <- file.path(downloads_path, file_list[[kIdf]]$filename)
  passwordFilePath <- ExecUnzipByPassword(
    file_list[[kIdf]]$path, 
    file_list[[kIdf]]$filename, 
    unzipDir, 
    "Enter IDF password: "
  )
  boxDirInfo <- SaveZipToBox("IDF", kIdf)
  box_ul(dir_id=boxDirInfo$zipId, passwordFilePath, pb=T)
  return(unzipDir)
}
SaveWhodd <- function() {
  if (!kWhoddZip %in% names(file_list)) {
    return()
  }
  dummy <- SaveZipToBox("WHO-DD", kWhoddZip)
  return()
}
UnzipWhodd <- function() {
  if (!kWhodd %in% names(file_list)) {
    return(NA)
  }
  awsDirName <- file_list[[kWhodd]]$filename |> str_remove(kWhoddJapanCrtParts) |> trimws()
  temp_unzipDir <- file.path(downloads_path, "tempUnzipWhodd")
  ExecUnzip(file_list[[kWhodd]]$path, file_list[[kWhodd]]$filename, temp_unzipDir)
  whoddZipFilePath <- temp_unzipDir |> list.files(pattern="*.zip", full.names=T)
  unzipDir <- file.path(downloads_path, file_list[[kWhodd]]$filename)
  ExecUnzip(whoddZipFilePath, basename(whoddZipFilePath), unzipDir)
  return(list(awsDirName=awsDirName, unzipDir=unzipDir))
}
# ------ main ------
dummy <- GetConfigText()
dummy <- GetREnviron()
downloads_path <- GetFolderPath("Downloads")
file_list <- GetDownloadFiles()
# WHO-DD
temp <- UnzipWhodd()
awsDirName <- temp$awsDirName
whoddUnzipDir <- temp$unzipDir
whoddDir <- "/WHODD/" %>% str_c(awsDirName, .)
# IDF
idfUnzipDir <- SaveCopyIdf()
idfDir <- "/IDF/" %>% str_c(awsDirName, .)
copyTargetList = list(
  list(fromName="全件.txt", toName="data.txt", toDir=idfDir, fromDir=idfUnzipDir),
  list(fromName="英名＜可変長＞.txt", toName="full_en.txt", toDir=idfDir, fromDir=idfUnzipDir),
  list(fromName="全件＜可変長＞.txt", toName="full_ja.txt", toDir=idfDir, fromDir=idfUnzipDir),
  list(fromName="IDMapping.csv", toName="IDMapping.csv", toDir=whoddDir, fromDir=whoddUnzipDir),
  list(fromName="WHODDsGenericNames.csv", toName="WHODDsGenericNames.csv", toDir=whoddDir, fromDir=whoddUnzipDir)
)
copyFiles <- GetCopyFileInfo(copyTargetList)


for (i in 1:length(copyFiles)) {
  path <- copyFiles[[i]]$path
  filename <- copyFiles[[i]]$filename
  awsDir <-  copyFiles[[i]]$awsDir
  res <- UploadToS3Folder(awsDir, path, filename)
  if (!res) {
    stop("aws push error.")
  }
}
# WHO-DDのデータをBoxに保存
SaveWhodd()


# 1passwordにあるWHO-DDのサイトにログインしたあと、メールにあるダウンロードリンクをクリックすると、ダウンロードファイルのページ遷移できる。ダウンロードフォルダにファイル落とす。のところまでは手動
## \Box\References\Coding\WHO-DDにデータを格納し→
## S3にデータ格納し→
# チャットにてISRに通知する。→手動
# meddra
# 研究管理室のグループアドレスに最新版リリースの情報が届く。研究管理室からメール転送されてきたら、サイトよりデータをダウンロードして、までは手動
## \Box\References\Coding\MedDRAにデータを格納し、
#チャットにてISRに通知する。→手動
