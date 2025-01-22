#' Output the extraction results to a Google spreadsheet.
#' Click on Source to run
#' @file outputGoogleSpreadSheet.R
#' @author Mariko Ohtsuka
#' @date 2024.10.11
# ------ libraries ------
library(googlesheets4)
# ------ constants ------
gs4_auth()
configJson <- here("config.json") |> read_json()
outputSpreadSheetId <- configJson$outputSpreadSheetId
outputSheetNames <- configJson$sheetNames |> list_flatten()
# ------ functions ------
CreateSheets <- function(sheetName) {
  sheet_list <- sheet_names(outputSpreadSheetId)
  # シートが存在するか確認
  if (!(sheetName %in% sheet_list)) {
    # シートが存在しない場合、新しいシートを作成
    sheet_add(outputSpreadSheetId, sheet = sheetName)
  }
}
ClearAndWriteSheet <- function(sheet_name, varName) {
  range_clear(outputSpreadSheetId, sheet = sheet_name)
  if (exists(varName)) {
    data <- get(varName)
    sheet_write(data, outputSpreadSheetId, sheet = sheet_name)
  } 
}
OutputSpreadSheet <- function() {
  # Googleスプレッドシートをクリア
  dummy <- outputSheetNames |> map( ~ CreateSheets(.))
  dummy <- names(outputSheetNames) |> map( ~ ClearAndWriteSheet(outputSheetNames[[.]], .))
}
# ------ main ------
OutputSpreadSheet()