#' test script
#' 
#' @file test-main.R
#' @author Mariko Ohtsuka
#' @date 2024.7.22
# ------ libraries ------
library(here)
library(tidyverse)
library(aws.s3)
library(daff)
# ------ constants ------
kIdfTargetZipName <- "mtlt299999_all.zip"
kIdfPasswordFilename <- kIdfTargetZipName |> str_replace(".zip", "_pw.txt")
# ------ functions ------
source(here("programs", "functions", "box-functions.R"),  encoding="UTF-8")
source(here("programs", "functions", "unzip-functions.R"),  encoding="UTF-8")
GetTestTarget <- function(parentDirId, targetName) {
  targetList <- parentDirId |> box_ls()
  for (i in 1:length(targetList)) {
    target <- targetList[[i]]
    if (target$name == targetName) {
      id <- target$id
      return(id)
    }
  }
}

GetAwsTsv <- function(filename, dirName) {
  awsObjectPath <- file.path(testAwsDir, filename)
  save_object(file.path(awsDirName, dirName, filename), kAwsBucketName, file=awsObjectPath)
  res <- awsObjectPath |> read_tsv(col_names=F)
  return(res)
}

OutputDiff <- function(df1, df2, outputPath) {
  diff <- diff_data(df1, df2)
  html_diff <- render_diff(diff)
  html_file <- basename(outputPath)
  write(html_diff, file=outputPath)
}

ExecDiff <- function(boxDir, boxFileName, awsFileName, category, htmlName) {
  boxCsv <- boxDir |> file.path(boxFileName) |> read_tsv(col_names=F)
  awsCsv <- awsFileName |> GetAwsTsv(category)
  OutputDiff(boxCsv, awsCsv, file.path(outputPath, htmlName))
}

# ------ main ------
current_year <- Sys.Date() |> format("%Y") |> as.numeric()
current_month <- Sys.Date() |> format("%m") |> as.numeric()
whoddMonth <- ifelse(current_month >= 9 || current_month < 3,  "Sep", "Mar")
whoddYear <- ifelse(current_month >= 3, current_year, current_year - 1)
awsDirName <- str_c(whoddYear, " ", whoddMonth, " 1")
whoddFileName <- str_c("WHODrug Japan CRT ", whoddYear, " ", whoddMonth, " 1.zip")
codingDirList <- kCodingDirId |> box_ls()
for (i in 1:length(codingDirList)) {
  target <- codingDirList[[i]]
  if (target$name == KWhoddBoxDirName) {
    whoddDirId <- target$id
  }
  if (target$name == KIdfBoxDirName) {
    idfDirId <- target$id
  }
}
# Download from Box
whoddZipId <- GetTestTarget(whoddDirId, kZipDirName)
idfZipId <- GetTestTarget(idfDirId, kZipDirName)
whoddFileId <- GetTestTarget(whoddZipId, whoddFileName)
# create dir for test
testDir <- file.path(downloads_path,  "whodd-idf-test") 
CreateDir(testDir)
testBoxDir <- file.path(testDir, "box")
CreateDir(testBoxDir)
testAwsDir <- file.path(testDir, "aws")
CreateDir(testAwsDir)
## who-dd box
boxWhoddZipFile <- whoddFileId |> box_dl(testBoxDir, overwrite=T)
testBoxWhoddDir <- file.path(testBoxDir, "testBoxWhodd")
CreateDir(testBoxWhoddDir)
ExecUnzip(boxWhoddZipFile, testBoxWhoddDir)
testBoxWhoddDir2 <- file.path(testBoxWhoddDir, "testBoxWhodd")
CreateDir(testBoxWhoddDir2)
list.files(testBoxWhoddDir, pattern="*.zip", full.names=T) |> ExecUnzip(testBoxWhoddDir2)
## idf box
idfFileId <- GetTestTarget(idfZipId, kIdfTargetZipName)
boxIdfZipFile <- idfFileId |> box_dl(testBoxDir, overwrite=T)
idfPasswordFileId <- GetTestTarget(idfZipId, kIdfPasswordFilename)
password <- box_read_tsv(idfPasswordFileId, header=F) %>% .[1, 1, drop=T]
testBoxIdfDir <- file.path(testBoxDir, "testBoxIdf")
CreateDir(testBoxIdfDir)
ExecUnzipByPassword(boxIdfZipFile, testBoxIdfDir, password)
idfParentFolderName <- testBoxIdfDir |> list.files(full.names=T)
zenkenTxtPath <- file.path(idfParentFolderName, "医薬品名データファイル") |> 
  list.files(full.names=T) |> str_extract(".*提供$") |> na.omit() |>
  list.files(full.names=T) |> str_extract(".*全件.txt") |> na.omit() %>% .[1]

# diff
outputPath <- file.path(testDir, "output")
CreateDir(outputPath)


ExecDiff(testBoxWhoddDir2, "IDMapping.csv", "IDMapping.csv", "WHODD", "idmapping.html")
ExecDiff(testBoxWhoddDir2, "WHODDsGenericNames.csv", "WHODDsGenericNames.csv", "WHODD", "WHODDsGenericNames.html")
ExecDiff(dirname(zenkenTxtPath), basename(zenkenTxtPath), "data.txt", "IDF", "zenken.html")
