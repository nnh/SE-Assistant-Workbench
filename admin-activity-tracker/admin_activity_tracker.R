#' title
#' description
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
# ------ constants ------
kParentPath <- "\\\\ARONAS\\Archives\\Log\\パッチのログ"
# ------ functions ------
GetHomeDir <- function() {
  os <- Sys.info()["sysname"]
  if (os == "Windows") {
    home_dir <- Sys.getenv("USERPROFILE")
  } else if (os == "Darwin") {
    home_dir <- Sys.getenv("HOME")
  } else {
    stop("Unsupported OS")
  }
  return (home_dir)
}
GetZoomLog <- function(target) {
  targetFiles <- file.path(kParentPath, "Zoom", target) %>% list.files(pattern="*.csv", full.names=T)
  logList <- targetFiles %>% map( ~ read_csv(., show_col_types=F))
  df_list <- logList %>% map_if( ~ is.data.frame(.x) && nrow(.x) == 0, ~ NULL) %>% compact()
  df <- df_list %>% bind_rows()
  res <- df %>% filter(カテゴリー != "記録" & カテゴリー != "レコーディング")
}
GetNasLog <- function() {
  targetFiles <- file.path(kParentPath, "ARONAS") %>% list.files(pattern="*.csv", full.names=T) %>% 
    str_extract("^.*SystemEventLog_.*") %>% na.omit()
  logList <- targetFiles %>% map( ~ read_csv(., show_col_types=F) %>% 
                                    filter((User != "System" & User != "---") & 
                                            Category != "App Status Change" & 
                                            Content != "[Malware Remover] Scan completed." & 
                                            `Severity Level` == "Information")
                                )
  df <- logList %>% bind_rows()
  res <- df %>% filter(Content != "[Malware Remover] Started scanning.") %>% 
                filter(!(Application == "Hybrid Backup Sync" & Category == "Job Status")) %>% 
                filter(Content != "[Antivirus] Updated virus definitions.") %>% 
                filter(!(Application == "App Center" & str_detect(Content, "enabled.$"))) %>%
                filter(Content != '[Network & Virtual Switch] Set "Adapter 1" as system default gateway. "Adapter 1" connected to the internet after checking NCSI.') %>% 
                filter(Content != '[Network & Virtual Switch] Failed to connect to the internet. System default gateway \"Adapter 1\" and all adapters failed to connect to the internet after checking NCSI.')
  res <- res %>% distinct() %>% arrange(Date, Time)
}
GetPrimeDriveLog <- function() {
  targetFiles <- file.path(kParentPath, "PrimeDrive") %>% list.files(pattern="*.csv", full.names=T)
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
  # 同じ内容なら一番古い情報だけ残す
  for (i in nrow(res):2) {
    if (res[i, "内容"] == res[i - 1, "内容"]) {
      res[i, "内容"] <- NA
    }
  }
  res <- res %>% filter(!is.na(内容))
}
GetGoogleLog <- function() {
  targetFiles <- file.path(kParentPath, "Google") %>% list.files(pattern="*.csv", full.names=T)
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
  df$description <- ifelse(is.na(df$イベントの説明), df$説明, df$イベントの説明)
  colnames(df)
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
GetFortiGateLog <- function() {
  targetFiles <- file.path(kParentPath, "FortiGate") %>% list.files(pattern="*.csv", full.names=T)
  logList <- targetFiles %>% map( ~ read_csv(., show_col_types=F, col_names=F))
  # 列名の設定
  targets <- logList %>% map( ~ SetFortiGateLogHeader(.))
  df <- targets %>% bind_rows()
  kExclude <- c("Admin logout successful", "Admin login successful", "Admin login failed","Test",
                "Device rebooted","Alert email send status failed",
                "Admin performed an action from GUI")
  res <- df %>% filter(!logdesc %in% kExclude) %>% 
    select(c("date", "time", "action", "cfgattr", "cfgobj", "cfgpath", "logdesc", "msg", "user")) %>%
    arrange(date, time)
}
# ------ main ------
fortiGateLog <- GetFortiGateLog()
googleLog <- GetGoogleLog()
primeDriveLog <- GetPrimeDriveLog()
nasLog <- GetNasLog()
z2Log <- "z2" %>% GetZoomLog()
z1Log <- "z1" %>% GetZoomLog()
