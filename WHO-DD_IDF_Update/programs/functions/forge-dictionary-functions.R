#' FORGE Dictionary Functions
#'
#' Description: This script includes functions to create FORGE(stat-forge) dictionary data files
#' (<kForgeDataDir>/meddra/<version>.js, <kForgeDataDir>/who_drug/<version>.js) from the extracted files,
#' and to register the version in <kForgeDataDir>/versions.js.
#' The output is the same as the drag & drop import in the FORGE web_tool (meddra_import.js / who_drug_import.js).
#' @file forge-dictionary-functions.R
#' @author Mariko Ohtsuka
#' @date 2026.9.30
# ------ libraries ------
# ------ constants ------
kForgeMeddra <- "meddra"
kForgeWhoDrug <- "who_drug"
kForgeMeddraColumns <- c(
  "llt_code", "llt_name", "pt_code", "pt_name",
  "hlt_code", "hlt_name", "hlgt_code", "hlgt_name", "soc_code", "soc_name"
)
kForgeWhoDrugColumns <- c("drug_code", "full_name_en", "generic_name_en")
kForgeVersionsJsHeader <- str_c(
  "// MedDRA/WHO Drugの利用可能なバージョン一覧(プルダウンの選択肢に使う)。\n",
  "// 「辞書バージョンの登録・管理」からD&Dでバージョンを登録するか、\n",
  "// SE-Assistant-Workbench(WHO-DD_IDF_Update)の辞書更新処理を実行すると、この一覧にも自動で追記される。\n"
)
# ------ functions ------
#' Get the source file path for the target file name from copyFiles
#'
#' @param copyFiles A list from GetCopyFileInfo()/BuildMeddraCopyFiles().
#' @param filename The target file name (after renaming).
#' @return The source file path.
GetForgeSourcePath <- function(copyFiles, filename) {
  path <- copyFiles |> keep(~ .$filename == filename) |> map_chr(~ .$path)
  if (length(path) != 1) {
    stop(str_c("File not found in copyFiles: ", filename))
  }
  return(path)
}

#' Read a delimited file without header as character columns (X1, X2, ...)
#'
#' Quotes are not interpreted and whitespace is not trimmed, same as the FORGE web_tool.
#' @param path The file path.
#' @param delim The delimiter.
#' @return A tibble.
ReadForgeDelimFile <- function(path, delim) {
  read_delim(path, delim = delim, col_names = FALSE, col_types = cols(.default = "c"),
             quote = "", trim_ws = FALSE, na = character(), progress = FALSE)
}

#' Read a comma separated (double quoted) file without header as character columns (X1, X2, ...)
#'
#' Empty fields are treated as NA, same as the FORGE web_tool.
#' @param path The file path.
#' @param encoding The file encoding.
#' @return A tibble.
ReadForgeQuotedCsvFile <- function(path, encoding = "UTF-8") {
  read_csv(path, col_names = FALSE, col_types = cols(.default = "c"), locale = locale(encoding = encoding),
           trim_ws = FALSE, na = "", progress = FALSE)
}

#' Build the MedDRA hierarchy (SOC-HLGT-HLT-PT-LLT) table from MedDRA .asc files
#'
#' Japanese name files (*_j.asc) are not used.
#' @param copyFiles A list from BuildMeddraCopyFiles().
#' @return A tibble with kForgeMeddraColumns.
BuildForgeMeddraTable <- function(copyFiles) {
  ReadAsc <- function(filename, colNames) {
    df <- copyFiles |> GetForgeSourcePath(filename) |> ReadForgeDelimFile("$")
    df <- df[, seq_along(colNames)]
    colnames(df) <- colNames
    return(df)
  }
  soc <- ReadAsc("soc.asc", c("soc_code", "soc_name")) |> distinct(soc_code, .keep_all = TRUE)
  hlgt <- ReadAsc("hlgt.asc", c("hlgt_code", "hlgt_name")) |> distinct(hlgt_code, .keep_all = TRUE)
  hlt <- ReadAsc("hlt.asc", c("hlt_code", "hlt_name")) |> distinct(hlt_code, .keep_all = TRUE)
  pt <- ReadAsc("pt.asc", c("pt_code", "pt_name")) |> distinct(pt_code, .keep_all = TRUE)
  llt <- ReadAsc("llt.asc", c("llt_code", "llt_name", "pt_code"))
  socHlgt <- ReadAsc("soc_hlgt.asc", c("soc_code", "hlgt_code"))
  hlgtHlt <- ReadAsc("hlgt_hlt.asc", c("hlgt_code", "hlt_code"))
  hltPt <- ReadAsc("hlt_pt.asc", c("hlt_code", "pt_code"))

  res <- socHlgt |>
    inner_join(soc, by = "soc_code") |>
    inner_join(hlgt, by = "hlgt_code") |>
    inner_join(hlgtHlt, by = "hlgt_code", relationship = "many-to-many") |>
    inner_join(hlt, by = "hlt_code") |>
    inner_join(hltPt, by = "hlt_code", relationship = "many-to-many") |>
    inner_join(pt, by = "pt_code") |>
    inner_join(llt, by = "pt_code", relationship = "many-to-many") |>
    select(all_of(kForgeMeddraColumns)) |>
    distinct()
  return(res)
}

#' Build the WHO Drug/IDF table (drug_code, full_name_en, generic_name_en) from WHO-DD and IDF files
#'
#' IDF/full_ja.txt is not used.
#' @param copyFiles A list from GetCopyFileInfo() (WHO-DD and IDF).
#' @return A tibble with kForgeWhoDrugColumns.
BuildForgeWhoDrugTable <- function(copyFiles) {
  # IDMapping.csv: ddd_label, ddd_code, idf_label, idf_code, note (tab separated)
  idMapping <- copyFiles |> GetForgeSourcePath("IDMapping.csv") |> ReadForgeDelimFile("\t") |>
    select(ddd_code = X2, idf_code = X4)
  genericNames <- copyFiles |> GetForgeSourcePath("WHODDsGenericNames.csv") |> ReadForgeDelimFile("\t") |>
    select(ddd_code = X1, generic_name_en = X2) |>
    mutate(generic_name_en = na_if(generic_name_en, "")) |>
    distinct(ddd_code, .keep_all = TRUE)
  fullEn <- copyFiles |> GetForgeSourcePath("full_en.txt") |> ReadForgeQuotedCsvFile() |>
    select(SEQ = X1, full_name_en = X2) |>
    distinct(SEQ, .keep_all = TRUE)
  # data.txt: X1=drug_code, X14=SEQ, X15=FLG
  idfCombined <- copyFiles |> GetForgeSourcePath("data.txt") |> ReadForgeQuotedCsvFile(encoding = "CP932") |>
    select(drug_code = X1, SEQ = X14, FLG = X15) |>
    filter(!is.na(FLG) & FLG != "C") |>
    left_join(fullEn, by = "SEQ") |>
    select(drug_code, full_name_en)

  res <- idfCombined |>
    full_join(idMapping, by = c("drug_code" = "idf_code"), relationship = "many-to-many") |>
    left_join(genericNames, by = "ddd_code") |>
    select(all_of(kForgeWhoDrugColumns)) |>
    distinct()
  return(res)
}

#' Create the JS text of a FORGE dictionary data file
#'
#' @param df A tibble (all columns character).
#' @param storeName The window variable name ("__meddraVersions" or "__whoDrugVersions").
#' @param version The version label.
#' @return The JS text.
BuildForgeDictionaryJsContent <- function(df, storeName, version) {
  jsonText <- jsonlite::toJSON(
    list(columns = colnames(df), rows = unname(asplit(as.matrix(df), 1))),
    auto_unbox = TRUE
  )
  versionText <- jsonlite::toJSON(version, auto_unbox = TRUE)
  content <- str_c(
    "window.", storeName, " = window.", storeName, " || {};\n",
    "window.", storeName, "[", versionText, "] = ", jsonText, ";\n"
  )
  return(content)
}

#' Read <kForgeDataDir>/versions.js
#'
#' @return A list with meddra and who_drug (each a list of list(label, file)).
ReadForgeVersionsJs <- function() {
  path <- file.path(kForgeDataDir, "versions.js")
  data <- list()
  if (file.exists(path)) {
    jsonText <- read_file(path) |>
      str_match("(?s)window\\.__dictionaryVersions\\s*=\\s*(\\{.*\\});")
    jsonText <- jsonText[, 2]
    if (!is.na(jsonText)) {
      data <- jsonlite::fromJSON(jsonText, simplifyVector = FALSE)
    }
  }
  for (kind in c(kForgeMeddra, kForgeWhoDrug)) {
    if (is.null(data[[kind]])) {
      data[[kind]] <- list()
    }
  }
  return(data)
}

#' Add list(label, file) to <kForgeDataDir>/versions.js (overwrite if the same label exists)
#'
#' @param kind "meddra" or "who_drug".
#' @param label The version label.
#' @param file The file name without extension.
#' @return None.
AddForgeVersionsJs <- function(kind, label, file) {
  data <- ReadForgeVersionsJs()
  entry <- list(label = label, file = file)
  idx <- data[[kind]] |> detect_index(~ .$label == label)
  if (idx > 0) {
    data[[kind]][[idx]] <- entry
  } else {
    data[[kind]] <- c(data[[kind]], list(entry))
  }
  content <- str_c(
    kForgeVersionsJsHeader,
    "window.__dictionaryVersions = ", jsonlite::toJSON(data, auto_unbox = TRUE, pretty = TRUE), ";\n"
  )
  write_file(content, file.path(kForgeDataDir, "versions.js"))
}

#' Write a FORGE dictionary data file and register it in versions.js
#'
#' @param df A tibble (all columns character).
#' @param kind "meddra" or "who_drug".
#' @param version The version label.
#' @return The output file path.
WriteForgeDictionaryJs <- function(df, kind, version) {
  if (!dir.exists(kForgeDataDir)) {
    stop(str_c("kForgeDataDir not found: ", kForgeDataDir))
  }
  storeName <- if (kind == kForgeMeddra) "__meddraVersions" else "__whoDrugVersions"
  outputDir <- file.path(kForgeDataDir, kind)
  if (!dir.exists(outputDir)) {
    dir.create(outputDir)
  }
  safeFilename <- str_replace_all(version, "[^A-Za-z0-9._-]", "_")
  outputPath <- file.path(outputDir, str_c(safeFilename, ".js"))
  df |> BuildForgeDictionaryJsContent(storeName, version) |> write_file(outputPath)
  AddForgeVersionsJs(kind, version, safeFilename)
  cat(str_c(outputPath, " (", nrow(df), " rows)\n"))
  return(outputPath)
}

#' Create the FORGE MedDRA data file from MedDRA copyFiles
#'
#' @param copyFiles A list from BuildMeddraCopyFiles().
#' @param version The MedDRA version (e.g. "28.1").
#' @return The output file path.
WriteForgeMeddraJs <- function(copyFiles, version) {
  copyFiles |> BuildForgeMeddraTable() |> WriteForgeDictionaryJs(kForgeMeddra, version)
}

#' Create the FORGE WHO Drug/IDF data file from WHO-DD and IDF copyFiles
#'
#' @param copyFiles A list from GetCopyFileInfo() (WHO-DD and IDF).
#' @param version The WHO-DD version folder name (e.g. "2025 Sep 1").
#' @return The output file path.
WriteForgeWhoDrugJs <- function(copyFiles, version) {
  copyFiles |> BuildForgeWhoDrugTable() |> WriteForgeDictionaryJs(kForgeWhoDrug, version)
}
