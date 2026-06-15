#' 管理者権限変更情報集約プログラム
#' 管理者権限で変更された情報を集約するプログラムです。
#' @file admin_activity_tracker.R
#' @author Mariko Ohtsuka
#' @date 2026.6.15
rm(list = ls())
# ------ ライブラリ ------
library(tidyverse)
library(here)
library(googlesheets4)
library(jsonlite)

# ------ 定数 ------
# Zoom：除外するカテゴリ
kZoomExcludeCategories <- c("記録", "レコーディング")

# ARONAS：除外するユーザー
kNasExcludeUsers <- c("System", "---")
# ARONAS：除外するログ内容
kNasExcludeContents <- c(
  "[Malware Remover] Scan completed.",
  "[Malware Remover] Started scanning.",
  "[Antivirus] Updated virus definitions.",
  '[Network & Virtual Switch] Set "Adapter 1" as system default gateway. "Adapter 1" connected to the internet after checking NCSI.',
  '[Network & Virtual Switch] Failed to connect to the internet. System default gateway "Adapter 1" and all adapters failed to connect to the internet after checking NCSI.'
)

# PrimeDrive：集約対象外の操作
kPrimeDriveExcludeOperations <- c(
  "ログイン", "ログアウト", "WEBメール送信(PrimeDrive送信)", "アップロードリンク発行",
  "フォルダ作成", "ダウンロードリンク発行", "アップロード", "ダウンロードリンクパスワード認証",
  "ダウンロードリンクダウンロード", "ダウンロードリンク署名", "ゴミ箱へ移動", "ダウンロード",
  "ダウンロードリンク自動ファイル削除", "アップロードリンクアップロード", "アップロードリンクコメント", "アップロードリンクパスワード認証",
  "削除", "PDFダウンロード", "移動", "共有設定（新規）", "パスワード変更", "パスワード変更URL発行", "名前の変更",
  "共有メンバーの変更（追加・削除）", "共有設定（変更）", "自動削除", "メモ", "ダウンロードリンクプレビュー",
  "ダウンロードリンク無効化", "ダウンロードリンク削除", "ダウンロードリンクPDFダウンロード",
  "アップロードリンク削除", "共有設定（解除）", "グループ作成", "グループ編集", "グループ削除",
  "ファイル所有者変更", "ファイル期限管理設定変更", "ユーザエクスポート", "ユーザ利用容量エクスポート",
  "検閲ダウンロード", "共有エクスポート", "ロック設定", "ロック解除",
  "ゴミ箱を空にする", "ファイル期限管理設定", "アップロードリンク無効化"
)
# PrimeDrive：ユーザー編集操作（別途管理するため本体から除外）
kPrimeDriveUserEditOperations <- c("ユーザ作成", "ユーザ編集", "ユーザ削除", "IPアドレス制限設定")

# Google：読み込み時に除外するイベント
kGoogleExcludeEvents <- c("アラートセンターを表示しました", "アラート センターの表示", "Google サイトの詳細を表示しました", "メールログ検索")
# Google：ユーザー編集イベント（別途管理するため本体から除外）
kGoogleUserEditEvents <- c(
  "ユーザー名の変更", "ニックネームの作成", "ニックネームの削除", "パスワードの変更", "パスワード変更",
  "次回ログイン時のパスワードの変更", "ユーザーの削除", "ユーザーの作成",
  "名の変更", "姓の変更", "ユーザー ライセンスの取り消し", "ユーザー ライセンスの割り当て",
  "ユーザー セッションのブロック解除", "ユーザーの停止の解除", "ユーザーの停止",
  "ユーザーリストのダウンロード", "グループを削除", "ユーザーの削除の取り消し",
  "ユーザーの組織部門の変更", "グループの説明の変更",
  "Gmail アカウントのリセット", "グループ メンバーの追加",
  "グループ メンバーのダウンロード", "ユーザーの強力な認証の解除",
  "グループ メンバーの削除", "グループ メンバーの作成"
)
# Google：アラート関連イベント（集約対象外）
kGoogleAlertEvents <- c(
  "アラートセンターでアラートの変更が記録されました", "アラートセンターでアラートの関連アラートが記録されました。",
  "アラートの変更の一覧表示", "アラートの関連アラートの一覧表示",
  "アラートのフィードバックの一覧表示",
  "アラートセンターにアラートのフィードバックが記録されました"
)
# Google：クエリ・エクスポート関連イベント（集約対象外）
kGoogleQueryEvents <- c(
  "監査と調査のクエリ", "監査と調査のクエリのレポート", "調査のクエリ",
  "データ エクスポートのリクエストの完了", "データ エクスポートの開始",
  "データ転送リクエストの作成", "Google サイトの詳細の表示",
  "調査のクエリ結果のエクスポート"
)

# FortiGate：除外するメッセージ
kFortiGateExcludeMessages <- c(
  "Admin logout successful", "Admin login successful", "Admin login failed", "Test",
  "Device rebooted", "Alert email send status failed",
  "Admin performed an action from GUI", "FortiCloud service activation failed",
  "Attempted to join FortiCloud"
)
# FortiGate：出力に必要な列名
kFortiGateRequiredColumns <- c("date", "time", "action", "cfgattr", "cfgobj", "cfgpath", "logdesc", "msg", "user")

# ------ 関数 ------
# OSに応じたネットワークボリュームのルートパスを返す
GetVolumeStr <- function() {
  os <- Sys.info()["sysname"]
  if (os == "Windows") {
    return("//aronas")
  } else if (os == "Darwin") {
    return("/Volumes")
  } else {
    stop("Unsupported OS")
  }
}

# config.json からスプレッドシートIDを読み込む
GetSpreadSheetId <- function(file_path) {
  tryCatch(
    {
      json <- read_json(file_path)
      return(json$spreadsheet_id)
    },
    error = function(e) {
      stop("JSONファイルの読み込みに失敗しました: ", conditionMessage(e))
    }
  )
}

# 日付から年月リスト（year, month）を生成する
GetYmList <- function(targetDate) {
  list(
    year = year(targetDate),
    month = sprintf("%02d", month(targetDate))
  )
}

# 前月の年月リストを返す
GetPreviousMonth <- function() {
  GetYmList(Sys.Date() %m-% months(1))
}

# 指定年月の翌月の年月リストを返す
GetNextMonth <- function(year, month) {
  GetYmList(ymd(paste(year, month, "01", sep = "-")) %m+% months(1))
}

# 指定ディレクトリからパターンに一致するファイル一覧を取得する
# ym_str を指定するとファイルパスに含まれるものだけに絞り込む
GetTargetFiles <- function(dir_path, pattern, ym_str = NULL) {
  files <- list.files(dir_path, pattern = pattern, full.names = TRUE)
  if (!is.null(ym_str)) files <- files[str_detect(files, fixed(ym_str))]
  files
}

# 列番号をアルファベット表記に変換する（26列超に対応）
ColNumToLetter <- function(n) {
  result <- ""
  while (n > 0) {
    remainder <- (n - 1) %% 26
    result <- paste0(LETTERS[remainder + 1], result)
    n <- (n - 1) %/% 26
  }
  result
}

# データフレームの書き込み範囲文字列（例："A1:E10"）を生成する
GetRange <- function(df, start_cell = "A1", col_names = TRUE) {
  start_col <- str_extract(start_cell, "^[A-Z]+")
  start_row <- as.numeric(str_extract(start_cell, "[0-9]+$"))
  end_col <- ColNumToLetter(ncol(df))
  # ヘッダー行を書く場合は1行分加算する
  end_row <- start_row + nrow(df) - 1 + if (col_names) 1 else 0
  paste0(start_col, start_row, ":", end_col, end_row)
}

# スプレッドシートの指定シートの既存データを取得する
GetSheetValues <- function(spreadsheet_id, sheet_name) {
  read_sheet(spreadsheet_id, sheet = sheet_name)
}

# データフレームを指定シートに追記する
# 既存データがある場合は1行空けて追記し、ヘッダーは書かない
WriteSheet <- function(df, sheet_name, spreadsheet_id) {
  if (nrow(df) == 0) {
    message("対象なし：", sheet_name)
    return(invisible(NULL))
  }
  existing <- GetSheetValues(spreadsheet_id, sheet_name)
  first_write <- nrow(existing) == 0
  start_row <- if (first_write) 1 else nrow(existing) + 2
  start_cell <- str_c("A", start_row)
  target_range <- GetRange(df, start_cell, col_names = first_write)
  range_write(ss = spreadsheet_id, data = df, sheet = sheet_name, col_names = first_write, range = target_range)
}

# Zoom操作ログを読み込み、集約対象外カテゴリを除外して返す
# target: "phone" などZoomフォルダ配下のサブディレクトリ名
GetZoomLog <- function(parent_path, target, targetYm = NULL) {
  ym_str <- if (!is.null(targetYm)) str_c("operationlog_", targetYm$year, "_", targetYm$month) else NULL
  files <- GetTargetFiles(file.path(parent_path, "Zoom", target), "*.csv", ym_str)
  df <- files %>%
    map(~ read_csv(., show_col_types = FALSE)) %>%
    keep(~ is.data.frame(.x) && nrow(.x) > 0) %>%
    bind_rows()
  if (nrow(df) == 0) return(df)
  df %>% filter(!カテゴリ %in% kZoomExcludeCategories)
}

# ARONAS（NAS）システムイベントログを読み込み、不要なログを除外して返す
# NASのログは翌月分のファイルに当月データが含まれるため、ファイル選択時に翌月を参照する
GetNasLog <- function(parent_path, targetYm = NULL) {
  all_files <- list.files(file.path(parent_path, "ARONAS"), pattern = "*.csv", full.names = TRUE)
  files <- na.omit(str_extract(all_files, "^.*SystemEventLog_.*"))
  if (!is.null(targetYm)) {
    next_ym <- GetNextMonth(targetYm$year, targetYm$month)
    files <- files[str_detect(files, str_c(next_ym$year, next_ym$month))]
  }
  df <- files %>%
    map(~ read_csv(., show_col_types = FALSE) %>%
      filter(
        !User %in% kNasExcludeUsers,
        Category != "App Status Change",
        !Content %in% kNasExcludeContents,
        `Severity Level` == "Information"
      )) %>%
    bind_rows()
  # Application列またはService列のどちらかに値がある場合を統合する
  if (!"Application" %in% colnames(df)) df$Application <- NA
  if (!"Service" %in% colnames(df)) df$Service <- NA
  df$ApplicationAndService <- coalesce(df$Application, df$Service)
  res <- df %>%
    filter(
      !(ApplicationAndService == "Hybrid Backup Sync" & Category == "Job Status"),
      !(ApplicationAndService == "App Center" & str_detect(Content, "enabled.$"))
    ) %>%
    distinct() %>%
    arrange(Date, Time) %>%
    select("Date", "Time", "User", "Content")
  if (!is.null(targetYm)) {
    res <- res %>%
      filter(
        format(Date, "%Y") == as.character(targetYm$year),
        format(Date, "%m") == targetYm$month
      )
  }
  res$Time <- as.character(res$Time)
  res
}

# PrimeDriveログを読み込み、集約対象外操作を除外して返す
GetPrimeDriveLog <- function(parent_path, targetYm = NULL) {
  ym_str <- if (!is.null(targetYm)) str_c(targetYm$year, targetYm$month) else NULL
  files <- GetTargetFiles(file.path(parent_path, "PrimeDrive"), "*.csv", ym_str)
  df <- files %>%
    map(~ read_csv(., show_col_types = FALSE)) %>%
    bind_rows()
  user_edit <- df %>% filter(操作 %in% kPrimeDriveUserEditOperations)
  res <- df %>%
    filter(!操作 %in% kPrimeDriveExcludeOperations) %>%
    anti_join(user_edit, by = colnames(user_edit)) %>%
    arrange(実行日)
  if (nrow(res) < 2) {
    return(res %>% filter(!is.na(内容)))
  }
  # 同じ内容が連続する場合は古い方だけ残す
  for (i in nrow(res):2) {
    if (res[i, "内容"] == res[i - 1, "内容"]) res[i, "内容"] <- NA
  }
  res %>%
    filter(!is.na(内容)) %>%
    select(-"接続元")
}

# Google管理コンソールのログを読み込み、集約対象外イベントを除外して返す
GetGoogleLog <- function(parent_path, targetYm = NULL) {
  ym_str <- if (!is.null(targetYm)) str_c(targetYm$year, targetYm$month) else NULL
  files <- GetTargetFiles(file.path(parent_path, "Google"), "*.csv", ym_str)
  df <- files %>%
    map(~ read_csv(., show_col_types = FALSE) %>%
      filter(!イベント %in% kGoogleExcludeEvents) %>%
      # ファイルによって日付列の型が異なるため文字列に統一する
      mutate(日付 = if (!is.character(日付)) as.character(日付, tz = "UTC") else 日付)
    ) %>%
    bind_rows()
  # ファイル世代によって説明列名が異なるため統合する
  df$description <- if ("イベントの説明" %in% colnames(df)) coalesce(df$イベントの説明, df$説明) else df$説明
  df <- df %>% select(event = イベント, actor = アクター, 日付, description)
  # ユーザー編集・アラート・クエリ系を順に除外する
  user_edit <- df %>% filter(event %in% kGoogleUserEditEvents)
  res <- df %>% anti_join(user_edit, by = colnames(user_edit))
  alert <- res %>% filter(event %in% kGoogleAlertEvents)
  res <- res %>%
    anti_join(alert, by = colnames(alert)) %>%
    filter(!event %in% kGoogleQueryEvents)
  res %>%
    mutate(
      # タイムゾーン表記（GMT+9）を除去して日付・時刻に分割する
      日付 = str_remove(日付, " GMT\\+9"),
      date = parse_date_time(str_sub(日付, 1, 10), orders = c("Ymd", "Y-m-d")),
      time = str_sub(日付, 12)
    ) %>%
    select(date, time, event, description, actor) %>%
    arrange(date, time)
}

# FortiGateのCSVヘッダーを設定する
# FortiGateのログは "key=value" 形式で格納されているため、キー名を列名として抽出し値を整形する
SetFortiGateLogHeader <- function(df) {
  if (!is.data.frame(df)) stop("target must be a data frame")
  col_names <- map_chr(seq_len(ncol(df)), function(i) {
    vals <- na.omit(df[[i]])
    if (length(vals) == 0) return(NA_character_)
    keys <- unique(str_extract(vals, "^[^=]+"))
    keys <- keys[!is.na(keys)]
    if (length(keys) == 0) NA_character_ else keys[1]
  })
  col_names[is.na(col_names)] <- paste0("dummy", which(is.na(col_names)))
  colnames(df) <- col_names
  for (i in seq_len(ncol(df))) {
    df[[i]] <- df[[i]] %>%
      str_remove(str_c(col_names[i], "=")) %>%
      str_remove_all('"')
  }
  df
}

# FortiGateログを読み込み、集約対象外メッセージを除外して返す
# ファイルにバイナリが混在する場合があるため、iconv で不正な文字を除去してから読み込む
GetFortiGateLog <- function(parent_path, targetYm = NULL) {
  ym_str <- if (!is.null(targetYm)) str_c("from_", targetYm$year, "-", targetYm$month) else NULL
  files <- GetTargetFiles(file.path(parent_path, "FortiGate"), "*.csv", ym_str)
  df <- files %>%
    map(function(path) {
      lines <- readLines(path, encoding = "UTF-8", warn = FALSE)
      clean_lines <- iconv(lines, from = "UTF-8", to = "UTF-8", sub = "")
      tmp <- tempfile(fileext = ".csv")
      writeLines(clean_lines, tmp)
      read_csv(tmp, show_col_types = FALSE)
    }) %>%
    map(SetFortiGateLogHeader) %>%
    bind_rows() %>%
    filter(!msg %in% kFortiGateExcludeMessages)
  if (nrow(df) == 0) return(df)
  # ファイルによって存在しない列があるためNAで補完する
  missing_cols <- setdiff(kFortiGateRequiredColumns, colnames(df))
  df[missing_cols] <- NA
  df %>%
    select(all_of(kFortiGateRequiredColumns)) %>%
    arrange(date, time)
}

# ------ メイン処理 ------
# NULLにするとすべてのファイルが処理対象になります
targetYm <- GetPreviousMonth()
# targetYm <- NULL
spreadsheet_id <- here("config.json") %>% GetSpreadSheetId()
parent_path <- str_c(GetVolumeStr(), "/Archives/Log/パッチのログ/")

gs4_auth(
  email = gargle::gargle_oauth_email(),
  scopes = "https://www.googleapis.com/auth/spreadsheets",
  cache = gargle::gargle_oauth_cache(),
  use_oob = gargle::gargle_oob_default(),
  token = NULL
)

# 各ログソースの取得関数・引数・書き込み先シート名を定義してまとめて実行する
list(
  list(fn = GetFortiGateLog,  args = list(parent_path, targetYm),          sheet = "FortiGate"),
  list(fn = GetGoogleLog,     args = list(parent_path, targetYm),          sheet = "Google"),
  list(fn = GetPrimeDriveLog, args = list(parent_path, targetYm),          sheet = "PrimeDrive"),
  list(fn = GetNasLog,        args = list(parent_path, targetYm),          sheet = "ARONAS"),
  list(fn = GetZoomLog,       args = list(parent_path, "phone", targetYm), sheet = "ZoomPhone")
) %>%
  walk(function(task) {
    df <- do.call(task$fn, task$args)
    WriteSheet(df, task$sheet, spreadsheet_id)
  })
