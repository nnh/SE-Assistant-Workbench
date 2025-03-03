#' Administrative Privilege Changes Consolidation Program
#' This is a program that consolidates information that has been changed with administrative privileges.
#' @file admin_activity_tracker.R
#' @author Mariko Ohtsuka
#' @date 2025.3.3
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(googlesheets4)
library(jsonlite)
# ------ functions ------
GetYmList <- function(targetDate) {
  year <- targetDate %>% year()
  month <- targetDate %>% month()
  result <- list(
    year=year,
    month=sprintf("%02d", month)
  )
  return(result)
}
GetCurrentMonth <- function() {
  ym <- Sys.Date() %>% GetYmList()
  return(ym)
}
GetPreviousMonth <- function() {
  current_date <- Sys.Date()
  previous_month <- current_date %m-% months(1)
  ym <- previous_month %>% GetYmList()
  return(ym)
}
GetNextMonth <- function(year, month) {
  current_date <- ymd(paste(year, month, "01", sep = "-"))
  next_month_date <- current_date %m+% months(1)
  ym <- next_month_date %>% GetYmList()
  return(ym)
}
GetVolumeStr <- function() {
  os <- Sys.info()["sysname"]
  if (os == "Windows") {
    volume_str <- "//aronas"
  } else if (os == "Darwin") {
    volume_str <- "/Volumes"
  } else {
    stop("Unsupported OS")
  }
  return (volume_str)
}
GetZoomLog <- function(target) {
  targetFiles <- file.path(kParentPath, "Zoom", target) %>% list.files(pattern="*.csv", full.names=T)
  if (is_list(kTargetYm)) {
    targetYm <- str_c("operationlog_", kTargetYm$year, "_", kTargetYm$month)
    targetFiles <- targetFiles %>% GetTargetFile(targetYm)
  }
  
  logList <- targetFiles %>% map( ~ read_csv(., show_col_types=F))
  df_list <- logList %>% map_if( ~ is.data.frame(.x) && nrow(.x) == 0, ~ NULL) %>% compact()
  df <- df_list %>% bind_rows()
  if (nrow(df) == 0) {
    return(df)
  }
  res <- df %>% filter(カテゴリー != "記録" & カテゴリー != "レコーディング")
}
GetNasLog <- function() {
  targetFiles <- file.path(kParentPath, "ARONAS") %>% list.files(pattern="*.csv", full.names=T) %>% 
    str_extract("^.*SystemEventLog_.*") %>% na.omit()
  if (is_list(kTargetYm)) {
    nasTargetYm <- GetNextMonth(kTargetYm$year, kTargetYm$month)
    targetYm <- str_c(nasTargetYm$year, nasTargetYm$month)
    targetFiles <- targetFiles %>% GetTargetFile(targetYm)
  }
  logList <- targetFiles %>% map( ~ read_csv(., show_col_types=F) %>% 
                                    filter((User != "System" & User != "---") & 
                                            Category != "App Status Change" & 
                                            Content != "[Malware Remover] Scan completed." & 
                                            `Severity Level` == "Information")
                                )
  df <- logList %>% bind_rows()
  if (!"Application" %in% colnames(df)) {
    df$Application <- NA
  }
  if (!"Service" %in% colnames(df)) {
    df$Service <- NA
  }
  df$ApplicationAndService <- ifelse(!is.na(df$Application), df$Application, df$Service)
  res <- df %>% filter(Content != "[Malware Remover] Started scanning.") %>% 
                filter(!(ApplicationAndService == "Hybrid Backup Sync" & Category == "Job Status")) %>% 
                filter(Content != "[Antivirus] Updated virus definitions.") %>% 
                filter(!(ApplicationAndService == "App Center" & str_detect(Content, "enabled.$"))) %>%
                filter(Content != '[Network & Virtual Switch] Set "Adapter 1" as system default gateway. "Adapter 1" connected to the internet after checking NCSI.') %>% 
                filter(Content != '[Network & Virtual Switch] Failed to connect to the internet. System default gateway \"Adapter 1\" and all adapters failed to connect to the internet after checking NCSI.')
  res <- res %>% distinct() %>% arrange(Date, Time) %>% select("Date", "Time", "User", "Content")
  if (is_list(kTargetYm)) {
    res <- res %>%
      filter(
        format(Date, "%Y") == as.character(kTargetYm$year), 
        format(Date, "%m") == kTargetYm$month             
      )
  }
  res$Time <- as.character(res$Time)
  return(res)
}
GetPrimeDriveLog <- function() {
  targetFiles <- file.path(kParentPath, "PrimeDrive") %>% list.files(pattern="*.csv", full.names=T)
  if (is_list(kTargetYm)) {
    targetYm <- str_c(kTargetYm$year, kTargetYm$month)
    targetFiles <- targetFiles %>% GetTargetFile(targetYm)
  }
  logList <- targetFiles %>% map( ~ read_csv(., show_col_types=F))
  df <- logList %>% bind_rows()
  kExclude <- c("ログイン", "ログアウト", "WEBメール送信(PrimeDrive送信)", "アップロードリンク発行", 
                "フォルダ作成", "ダウンロードリンク発行", "アップロード", "ダウンロードリンクパスワード認証", 
                "ダウンロードリンクダウンロード", "ダウンロードリンク署名", "ゴミ箱へ移動", "ダウンロード", 
                "ダウンロードリンク自動ファイル削除", "アップロードリンクアップロード", "アップロードリンクコメント", "アップロードリンクパスワード認証",
                "削除", "PDFダウンロード", "移動", "共有設定（新規）", "パスワード変更", "パスワード変更URL発行", "名前の変更", 
                "共有メンバーの変更（追加・削除）", "共有設定（変更）", "自動削除", "メモ", "ダウンロードリンクプレビュー",
                "ダウンロードリンク無効化", "ダウンロードリンク削除", "ダウンロードリンクPDFダウンロード", 
                "アップロードリンク削除", "共有設定（解除）","グループ作成", "グループ編集", "グループ削除", 
                "ファイル所有者変更", "ファイル期限管理設定変更","ユーザエクスポート", "ユーザ利用容量エクスポート",
                "検閲ダウンロード","共有エクスポート", "ロック設定", "ロック解除", 
                "ゴミ箱を空にする", "ファイル期限管理設定", "アップロードリンク無効化")
  kUserEdit <- c("ユーザ作成","ユーザ編集", "ユーザ削除", "IPアドレス制限設定")
  res <- df %>% 
    filter(!操作 %in% kExclude) %>% arrange(実行日)
  userEditRes <- res %>% filter(操作 %in% kUserEdit)
  res <- res %>% anti_join(userEditRes, by=colnames(userEditRes))
  if (nrow(res) < 2) {
    res <- res %>% filter(!is.na(内容))
    return(res)
  }
  # 同じ内容なら一番古い情報だけ残す
  for (i in nrow(res):2) {
    if (res[i, "内容"] == res[i - 1, "内容"]) {
      res[i, "内容"] <- NA
    }
  }
  res <- res %>% filter(!is.na(内容)) %>% select(-c("接続元"))
}
GetGoogleLog <- function() {
  targetFiles <- file.path(kParentPath, "Google") %>% list.files(pattern="*.csv", full.names=T)
  if (is_list(kTargetYm)) {
    targetYm <- str_c(kTargetYm$year, kTargetYm$month)
    targetFiles <- targetFiles %>% GetTargetFile(targetYm)
  }
  logList <- targetFiles %>% map( ~ read_csv(., show_col_types=F) %>% 
                                    filter(イベント != "アラートセンターを表示しました" & 
                                           イベント != "アラート センターの表示" &
                                           イベント != "Google サイトの詳細を表示しました"))
  target <- list()
  for (i in 1:length(logList)) {
    df <- logList[[i]] %>%
      mutate(
        日付 = if (!is.character(日付)) {
          as.character(日付, tz = "UTC")
        } else {
          日付
        }
      )
    target[[i]] <- df
  }
  df <- target %>% bind_rows() 
  if ("イベントの説明" %in% colnames(df)) {
    df$description <- ifelse(is.na(df$イベントの説明), df$説明, df$イベントの説明)
  } else {
    df$description <- df$説明
  }
  df <- df %>% select("event"="イベント", "actor"="アクター", "日付", "description") %>% filter(event != "メールログ検索")
  kUserEdit <- c("ユーザー名の変更", "ニックネームの作成", "ニックネームの削除", "パスワードの変更", "パスワード変更",
                 "次回ログイン時のパスワードの変更", "ユーザーの削除", "ユーザーの作成",
                 "名の変更", "姓の変更","ユーザー ライセンスの取り消し","ユーザー ライセンスの割り当て",
                 "ユーザー セッションのブロック解除", "ユーザーの停止の解除","ユーザーの停止",
                 "ユーザーリストのダウンロード","グループを削除","ユーザーの削除の取り消し",
                 "ユーザーの組織部門の変更" ,"グループの説明の変更",
                 "Gmail アカウントのリセット", "グループ メンバーの追加",
                 "グループ メンバーのダウンロード","ユーザーの強力な認証の解除",
                 "グループ メンバーの削除", "グループ メンバーの作成")
  userEditRes <- df %>% filter(event %in% kUserEdit)
  res <- df %>% anti_join(userEditRes, by=colnames(userEditRes))
  kAlert <- c("アラートセンターでアラートの変更が記録されました", "アラートセンターでアラートの関連アラートが記録されました。",
              "アラートの変更の一覧表示","アラートの関連アラートの一覧表示",
              "アラートのフィードバックの一覧表示",
              "アラートセンターにアラートのフィードバックが記録されました")
  alertRes <- res %>% filter(event %in% kAlert)
  res <- res %>% anti_join(alertRes, by=colnames(alertRes))
  kQuery <- c("監査と調査のクエリ", "監査と調査のクエリのレポート", "調査のクエリ",
              "データ エクスポートのリクエストの完了","データ エクスポートの開始", 
              "データ転送リクエストの作成","Google サイトの詳細の表示",
              "調査のクエリ結果のエクスポート")
  queryRes <- res %>% filter(event %in% kQuery)
  res <- res %>% anti_join(queryRes, by=colnames(queryRes))
  res$event %>% unique()
  result <- res %>%
    mutate(
      # GMT+9を削除
      日付 = str_remove(日付, " GMT\\+9"),
      # 列を分割
      date = parse_date_time(str_sub(日付, 1, 10), orders = c("Ymd", "Y-m-d")),
      time = str_sub(日付, 12)
    ) %>% select(c("date", "time", "event", "description", "actor"))
  result <- result %>% arrange(date, time)
}
SetFortiGateLogHeader <- function(target) {
  colNamesValue <- target %>% map_chr( ~ str_split_i(., "=", 1) %>% na.omit() %>% unique())
  colnames(target) <- colNamesValue
  for (i in 1:ncol(target)) {
    target[[i]] <- target[[i]] %>% str_remove(str_c(colNamesValue[i], "=")) %>% str_remove_all('"')
  }
  return(target)
}
GetTargetFile <- function(targetFiles, targetYm) {
  res <- targetFiles %>% .[str_detect(., targetYm)]
  return(res)
} 
GetFortiGateLog <- function() {
  targetFiles <- file.path(kParentPath, "FortiGate") %>% list.files(pattern="*.csv", full.names=T)
  if (is_list(kTargetYm)) {
    targetYm <- str_c("from_", kTargetYm$year, "-", kTargetYm$month)
    targetFiles <- targetFiles %>% GetTargetFile(targetYm)
  }
  logList <- targetFiles %>% map( ~ read_csv(., show_col_types=F, col_names=F))
  # 列名の設定
  targets <- logList %>% map( ~ SetFortiGateLogHeader(.))
  temp_df <- targets %>% bind_rows()
  kExclude <- c("Admin logout successful", "Admin login successful", "Admin login failed","Test",
                "Device rebooted","Alert email send status failed",
                "Admin performed an action from GUI")
  df <- temp_df %>% filter(!logdesc %in% kExclude)
  if (nrow(df) == 0) {
    return(df)
  }
  required_columns <- c("date", "time", "action", "cfgattr", "cfgobj", "cfgpath", "logdesc", "msg", "user")
  fortigate_colnames <- df %>% colnames()
  for (i in 1:length(required_columns)) {
    if (!required_columns[i] %in% fortigate_colnames) {
      df[, required_columns[i]] <- NA
    }
  }
  res <- df %>%
    select(c("date", "time", "action", "cfgattr", "cfgobj", "cfgpath", "logdesc", "msg", "user")) %>%
    arrange(date, time)
  return(res)
}
SetFortiGateLog <- function() {
  df <- GetFortiGateLog()
  df %>% WriteSheet("FortiGate")
}
SetGoogleLog <- function() {
  df <- GetGoogleLog()
  df %>% WriteSheet("Google")
}
SetPrimeDriveLog <- function() {
  df <- GetPrimeDriveLog()
  df %>% WriteSheet("PrimeDrive")
}
SetNasLog <- function() {
  df <- GetNasLog()
  df %>% WriteSheet("ARONAS")
}
SetZoomLog <- function(target) {
  df <- GetZoomLog(target)
  sheetName <- ifelse(target == "z1", "Zoom1", "Zoom2")
  df %>% WriteSheet(sheetName)
}
GetSpreadSheetId <- function(file_path) {
  tryCatch(
    {
      json <- read_json(file_path)
      id <- json$spreadsheet_id
      return(id)
    },
    error = function(e) {
      stop("JSONファイルの読み込みに失敗しました: ", conditionMessage(e))
    }
  )
}
GetSheetValues <- function(sheetName) {
  return(read_sheet(kSpreadSheetId, sheet=sheetName))
}
WriteSheet <- function(target, sheetName) {
  if (nrow(target) == 0) {
    print(str_c("対象なし：", sheetName))
    return()
  }
  existingData <- GetSheetValues(sheetName)
  startRow = ifelse(nrow(existingData) == 0, 1, nrow(existingData) + 2)
  col_f <- startRow == 1
  startCell <- str_c("A", startRow)
  targetRange <- target %>% GetRange(start_cell=startCell, col_f)
  googlesheets4::range_write(ss=kSpreadSheetId, data=target, sheet=sheetName, col_names=col_f, range=targetRange)
}
GetRange <- function(df, start_cell="A1", col_f) {
  start_col <- substr(start_cell, 1, 1)
  start_row <- as.numeric(substr(start_cell, 2, nchar(start_cell)))
  
  end_col <- LETTERS[ncol(df)] # 列数をアルファベットで表現
  end_row <- start_row + nrow(df) - 1
  if (col_f) {
    end_row <- end_row + 1
  }
  
  paste0(start_col, start_row, ":", end_col, end_row)
}
# ------ constants ------
kTargetYm <- GetPreviousMonth() # NAを入れるとすべてのファイルが処理対象になります
#kTargetYm <- NA
kSpreadSheetId <- here("config.json") %>% GetSpreadSheetId()
volume_str <- GetVolumeStr()
kParentPath <- volume_str %>% str_c("/Archives/Log/パッチのログ/")
# ------ main ------
gs4_auth(
  email = gargle::gargle_oauth_email(),
  scopes = "https://www.googleapis.com/auth/spreadsheets",
  cache = gargle::gargle_oauth_cache(),
  use_oob = gargle::gargle_oob_default(),
  token = NULL)
dummy <- SetFortiGateLog()
dummy <- SetGoogleLog()
dummy <- SetPrimeDriveLog()
dummy <- SetNasLog()
dummy <- c("z2", "z1") %>% map( ~ SetZoomLog(.))
