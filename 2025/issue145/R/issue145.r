rm(list = ls())
library(tidyverse)
library(jsonlite)
library(googlesheets4)

# 関数定義: validate_spreadsheet_id
# @param ss: 確認したいスプレッドシートのIDまたはURL
# @return: 有効な場合はTRUE、無効な場合はSTOPエラー
validate_spreadsheet_id <- function(ss) {

  # tryCatchを使ってエラーをハンドリングします
  result <- tryCatch({
    # メタデータの取得を試みる
    gs4_get(ss)
    TRUE
  }, error = function(e) {
    # エラーが発生した場合（ID不備、権限不足など）はここでキャッチ
    stop(paste0("エラー: 指定されたスプレッドシートID '", ss,
                "' が見つからないか、アクセス権限がありません。\n元のエラー内容: ", e$message),
         call. = FALSE)
  })

  return(result)
}
# 関数定義: write_to_google_sheet
# @param data: 書き込みたいデータフレーム
# @param ss: スプレッドシートのIDまたはURL
# @param sheet_name: 書き込み先のシート名
write_to_google_sheet <- function(data, ss, sheet_name) {

  # 指定したシート名にデータを書き込みます
  # シートが存在しない場合は新規作成され、存在する場合は内容が置き換わります
  sheet_write(data, ss = ss, sheet = sheet_name)

  message(paste0("シート '", sheet_name, "' への書き込みが完了しました。"))
}
# 関数1: get_file_paths
# @param target_dir: 対象のフォルダパス
# @param pattern: 抽出したいファイル形式（例: "\\.csv$"） デフォルトは全ファイル
get_file_paths <- function(target_dir, pattern = NULL) {

  # フォルダの存在確認
  if (!dir.exists(target_dir)) {
    stop(paste("エラー: フォルダ '", target_dir, "' が見つかりません。"), call. = FALSE)
  }

  # ファイルリストの取得（full.names = TRUE でフルパスを取得）
  files <- list.files(target_dir, pattern = pattern, full.names = TRUE)

  # ファイルが1つも見つからない場合の警告
  if (length(files) == 0) {
    warning("指定されたフォルダにファイルが見つかりませんでした。")
  }

  return(files)
}
extract_mtime_table <- function(file_paths) {

  if (length(file_paths) == 0) return(data.frame())

  file_details <- file.info(file_paths)

  # 更新日時を取得
  raw_mtime <- file_details$mtime

  # 指定の形式 "YYYY/MM/DD HH:mm" に変換
  # %Y: 年(4桁), %m: 月(01-12), %d: 日(01-31), %H: 時(00-23), %M: 分(00-59)
  formatted_mtime <- format(raw_mtime, "%Y/%m/%d %H:%M")

  # データフレームとして構成
  result_table <- data.frame(
    mtime = formatted_mtime,
    row.names = rownames(file_details),
    stringsAsFactors = FALSE
  )

  return(result_table)
}
# 関数3: get_folder_mtime_report (ファイル名抽出版)
# @param target_dir: 対象のフォルダパス
# @param pattern: 抽出したいファイル形式（例: "\\.csv$"）
get_folder_mtime_report <- function(target_dir, pattern = NULL) {

  # 1. ファイルパス一覧を取得 (関数1を呼び出し)
  file_paths <- get_file_paths(target_dir, pattern = pattern)

  if (length(file_paths) == 0) {
    message("指定された条件に一致するファイルが見つかりませんでした。")
    return(data.frame())
  }

  # 2. 更新日時テーブルを作成 (関数2を呼び出し)
  mtime_table <- extract_mtime_table(file_paths)

  # 3. フルパスから「ファイル名」のみを抽出して列に変換
  # basename() を使うことで "/path/to/file.csv" -> "file.csv" になります
  mtime_table$file_name <- basename(rownames(mtime_table))

  # 行名をリセット（インデックス番号にする）
  rownames(mtime_table) <- NULL

  # 列の並び替え（ファイル名を左に、更新日時を右に）
  mtime_table <- mtime_table[, c("file_name", "mtime")]
  colnames(mtime_table) <- c("ファイル名", "更新日")

  return(mtime_table)
}
config <- fromJSON("config.json")
spreadsheetId <- config$spreadsheetId
# スプレッドシートIDの検証
validate_spreadsheet_id(spreadsheetId)
parentPath <- config$parentPath
# crf data
crf_data_dir <- file.path(parentPath, "input", "rawdata")
crf_data <- get_folder_mtime_report(crf_data_dir, pattern = "\\.csv$")

# データをGoogle Sheetsに書き込む
write_to_google_sheet(crf_data, ss = spreadsheetId, sheet_name = "crf_data")

# 外部データ
external_data_dir <- file.path(parentPath, "input", "ext")
external_data <- get_folder_mtime_report(external_data_dir, pattern = "\\.*$")
write_to_google_sheet(external_data, ss = spreadsheetId, sheet_name = "external_data")

# 解析用データセット
ads_data_dir <- file.path(parentPath, "input", "ads")
ads_data <- get_folder_mtime_report(ads_data_dir, pattern = "\\.*$")
write_to_google_sheet(ads_data, ss = spreadsheetId, sheet_name = "ads_data")
# 解析用データセット作成プログラム
dummy_data <- data.frame(
    id = integer(),
    value = character(),
    stringsAsFactors = FALSE
)
write_to_google_sheet(dummy_data, ss = spreadsheetId, sheet_name = "ads_programs_data")
# 解析帳票作成プログラム
report_data_dir <- file.path(parentPath, "program")
report_data_macro_dir <- file.path(parentPath, "program", "macro")
report_data <- get_folder_mtime_report(report_data_dir, pattern = "\\.sas$")
report_data_macro <- get_folder_mtime_report(report_data_macro_dir, pattern = "\\.sas$")
report_data <- rbind(report_data, report_data_macro)
write_to_google_sheet(report_data, ss = spreadsheetId, sheet_name = "report_programs_data")
# 解析結果 main
result_data_dir <- file.path(parentPath, "output")
result_data <- get_folder_mtime_report(result_data_dir, pattern = "\\.xlsx$")
write_to_google_sheet(result_data, ss = spreadsheetId, sheet_name = "report_main_data")
# 解析用データセット qc
write_to_google_sheet(dummy_data, ss = spreadsheetId, sheet_name = "qc_ads_data")
# 解析結果 qc
result_qc_data_dir <- file.path(parentPath, "output", "qc")
result_qc_data <- get_folder_mtime_report(result_qc_data_dir, pattern = "\\.xlsx$")
write_to_google_sheet(result_qc_data, ss = spreadsheetId, sheet_name = "qc_report_data")