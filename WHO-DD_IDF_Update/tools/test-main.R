#' test script
#'
#' @file test-main.R
#' @author Mariko Ohtsuka
#' @date 2025.9.26
rm(list = ls())
# ------ libraries ------
library(here)
source(here("programs", "functions", "common.R"), encoding = "UTF-8")
library(daff)
library(readxl)
library(jsonlite)
# ------ constants ------
versions <- here("ext", "version.json") |> read_json()
idfVersion <- versions$version$IDF
kIdfTargetZipName <- str_c("mtlt", idfVersion, "_all.zip")
kIdfPasswordFilename <- kIdfTargetZipName |> str_replace(".zip", "_pw.txt")
kTestIdMapping <- "IDMapping.csv"
kTestWHODDsGenericNames <- "WHODDsGenericNames.csv"
kTestOutputFolder <- "output"
kTestZenken <- "data.txt"
kTestZenkenKahen <- "full_ja.txt"
kTestEimei <- "full_en.txt"
kWhoddFolder <- "WHODD"
kIdfFolder <- "IDF"
kVersionFile <- "Version.txt"
# ------ functions ------
source(here("programs", "functions", "s3-functions.R"), encoding = "UTF-8")
source(here("programs", "functions", "unzip-functions.R"), encoding = "UTF-8")
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
  save_object(file.path(awsDirName, dirName, filename), bucket = kAwsBucketName, file = awsObjectPath, region = kAwsDefaultRegion)
  res <- awsObjectPath |> read_tsv(col_names = F, show_col_types = F)
  return(res)
}

OutputDiff <- function(df1, df2, outputPath) {
  diff <- diff_data(df1, df2)
  html_diff <- render_diff(diff)
  html_file <- basename(outputPath)
  write(html_diff, file = outputPath)
}

ExecDiff <- function(boxDir, boxFileName, awsFileName, category, htmlName) {
  boxCsv <<- boxDir |>
    file.path(boxFileName) |>
    read_tsv(col_names = F, show_col_types = F)
  awsCsv <<- awsFileName |> GetAwsTsv(category)
  OutputDiff(boxCsv, awsCsv, file.path(outputPath, htmlName))
}

ReadCsvAllString <- function(targetPath) {
  # 列数を事前に取得
  num_cols <- length(read.csv(targetPath, fileEncoding = "cp932", header = F, nrows = 1))
  # 全ての列を文字列として指定
  col_classes <- rep("character", num_cols)
  res <- targetPath |> read.csv(fileEncoding = "cp932", header = F, colClasses = col_classes)
  return(res)
}

# ------ main ------
dummy <- GetREnviron()
current_year <- Sys.Date() |>
  format("%Y") |>
  as.numeric()
current_month <- Sys.Date() |>
  format("%m") |>
  as.numeric()
whoddMonth <- ifelse(current_month >= 9 || current_month < 3, "Sep", "Mar")
whoddYear <- ifelse(current_month >= 3, current_year, current_year - 1)
awsDirName <- str_c(kAwsParentDirName, "/", whoddYear, " ", whoddMonth, " 1")
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
testDir <- file.path(downloads_path, "whodd-idf-test")
unlink(testDir, recursive = T)
CreateDir(testDir)
testBoxDir <- file.path(testDir, "box")
CreateDir(testBoxDir)
testAwsDir <- file.path(testDir, "aws")
CreateDir(testAwsDir)
outputPath <- file.path(testDir, kTestOutputFolder)
CreateDir(outputPath)
## who-dd box
boxWhoddZipFile <- whoddFileId |> box_dl(testBoxDir, overwrite = T)
testBoxWhoddDir <- file.path(testBoxDir, "testBoxWhodd")
CreateDir(testBoxWhoddDir)
ExecUnzip(boxWhoddZipFile, testBoxWhoddDir)
testBoxWhoddDir2 <- file.path(testBoxWhoddDir, "testBoxWhodd")
CreateDir(testBoxWhoddDir2)
list.files(testBoxWhoddDir, pattern = "*.zip", full.names = T) |> ExecUnzip(testBoxWhoddDir2)
## idf box
idfFileId <- GetTestTarget(idfZipId, kIdfTargetZipName)
boxIdfZipFile <- idfFileId |> box_dl(testBoxDir, overwrite = T)
idfPasswordFileId <- GetTestTarget(idfZipId, kIdfPasswordFilename)
password <- box_read_tsv(idfPasswordFileId, header = F) %>% .[1, 1, drop = T]
testBoxIdfDir <- file.path(testBoxDir, "testBoxIdf")
CreateDir(testBoxIdfDir)
ExecUnzipByPassword(boxIdfZipFile, testBoxIdfDir, password)
idfParentFolderName <- testBoxIdfDir |> list.files(full.names = T)
zenkenTxtPath <- file.path(idfParentFolderName, "医薬品名データファイル") |>
  list.files(full.names = T) |>
  str_extract(".*提供$") |>
  na.omit() |>
  list.files(full.names = T) |>
  str_extract(".*全件.txt") |>
  na.omit() %>%
  .[1]
zenkenkahenTxtPath <- file.path(idfParentFolderName, "医薬品名データファイル＜可変長＞") |>
  list.files(full.names = T) |>
  str_extract(".*全件＜可変長＞.txt") |>
  na.omit() %>%
  .[1]
eimeikahenTxtPath <- file.path(idfParentFolderName, "英名＜可変長＞") |>
  list.files(full.names = T) |>
  str_extract(".*英名＜可変長＞.txt") |>
  na.omit() %>%
  .[1]
# *** test start ***
## テスト１：想定通りのBOXのファイルがAWSにアップロードされているかDIFFを取って確認する
ExecDiff(testBoxWhoddDir2, kTestIdMapping, kTestIdMapping, kWhoddFolder, "idmapping.html")
ExecDiff(testBoxWhoddDir2, kTestWHODDsGenericNames, kTestWHODDsGenericNames, kWhoddFolder, "WHODDsGenericNames.html")
ExecDiff(testBoxWhoddDir2, kVersionFile, kVersionFile, kWhoddFolder, "Version.html")
ExecDiff(dirname(zenkenTxtPath), basename(zenkenTxtPath), kTestZenken, kIdfFolder, "data.html")
ExecDiff(dirname(zenkenkahenTxtPath), basename(zenkenkahenTxtPath), kTestZenkenKahen, kIdfFolder, "full_ja.html")
ExecDiff(dirname(eimeikahenTxtPath), basename(eimeikahenTxtPath), kTestEimei, kIdfFolder, "full_en.html")
## テスト２：新規追加された項目がIDFの全件ファイルに存在することを確認する
shinkiTxtPath <- file.path(idfParentFolderName, "医薬品名データファイル", "前回との差分") |>
  list.files(full.names = T) |>
  str_extract(".*新規[0-9]{6}.txt") |>
  na.omit() %>%
  .[1]
shinkiTxt <- shinkiTxtPath |> ReadCsvAllString()
zenkenTxt <- file.path(testAwsDir, kTestZenken) |> ReadCsvAllString()
checkZenken <- inner_join(zenkenTxt, shinkiTxt, by = "V1") |>
  nrow() |>
  all.equal(nrow(shinkiTxt))
if (!checkZenken) {
  stop("error:test2")
} else {
  cat("test2:OK\n")
}
## テスト３：IDFの可変長テキストが全件と同じ行数であることを確認する
zenkenkahenTxt <- file.path(testAwsDir, kTestZenkenKahen) |> ReadCsvAllString()
eimeiKahenTxt <- file.path(testAwsDir, kTestEimei) |> ReadCsvAllString()
if (nrow(zenkenTxt) != nrow(zenkenkahenTxt) | nrow(zenkenTxt) != nrow(eimeiKahenTxt)) {
  stop("error:test3")
} else {
  cat("test3:OK\n")
}
## テスト４：IDFで新規追加された項目がWHODDのidMappingにも存在することを確認する
idMappingTxt <- file.path(testAwsDir, kTestIdMapping) |> read_tsv(col_names = F, show_col_types = F)
checkIdMapping <- inner_join(idMappingTxt, shinkiTxt, by = c("X4" = "V1")) |> nrow()
if (checkIdMapping == 0) {
  stop("error:test4")
} else {
  cat("test4:OK\n")
}
## テスト５：WHODDのレコード数が想定通りであることを確認する
whoddTableTotal <- file.path(testBoxWhoddDir2, "TableTotals.xlsx") |> read_excel(sheet = 1)
idMappingRow <- whoddTableTotal |>
  filter(Table == kTestIdMapping) %>%
  .[1, "No of rows", drop = T]
whoddsGenericNamesRow <- whoddTableTotal |>
  filter(Table == kTestWHODDsGenericNames) %>%
  .[1, "No of rows", drop = T]
whoddsGenericNames <- file.path(testAwsDir, kTestWHODDsGenericNames) |> read_tsv(col_names = F, show_col_types = F)
if (nrow(idMappingTxt) != idMappingRow | nrow(whoddsGenericNames) != whoddsGenericNamesRow) {
  stop("error:test5")
} else {
  cat("test5:OK\n")
}
cat(str_c(file.path(testDir, kTestOutputFolder), "配下のHTMLファイルの内容を確認してください"))
# テスト６：バージョンの表示
versionTxt <- file.path(testBoxWhoddDir2, kVersionFile) |> read_lines()
print(versionTxt)
