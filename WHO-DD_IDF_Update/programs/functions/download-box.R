#' Download files from Box
#' This script includes functions to download WHODD and IDF files from Box.
#' @file download-box.R
#' @author Mariko Ohtsuka
#' @date 2024.7.23
# ------ libraries ------
# ------ constants ------
# ------ functions ------
GetBoxTargetFiles <- function(id, pattern) {
  targetFiles <- GetTargetBoxDir(id)
  res <- targetFiles |> 
    filter(type == "file" & str_detect(name, pattern))
  return(res)  
}
GetLatestFileInfo <- function(targetFiles) {
  latestYm <- targetFiles |> filter(ym == max(ym))
  id <- latestYm[1, "id", drop=T] |> flatten_chr()
  name <- latestYm[1, "name", drop=T] |> flatten_chr()
  return(list(id=id, name=name))
}

GetLatestWhoddFile <- function(whoddBoxDirInfo) {
  targetWhoddFiles <- whoddBoxDirInfo$zipId |> GetBoxTargetFiles(str_c(kWhoddJapanCrtParts, "\\s2[0-9]{3}\\s[A-Z][a-z]{2}\\s[0-9]", kZipExtention))
  targetWhoddFiles$ym <- targetWhoddFiles$name  |> str_replace(" Mar ", "03") |> str_replace(" Sep ", "09") |> 
    trimws() |> str_extract("2[0-9]{6}") |> as.numeric()
  res <- targetWhoddFiles |> GetLatestFileInfo()
}

GetTargetIdfFile <- function(idfBoxDirInfo) {
  targetIdfFiles <- idfBoxDirInfo$zipId |> GetBoxTargetFiles(str_c(kIdfFileNameParts, kIdfAllFooter, kZipExtention))
  targetIdfFiles$ym <- targetIdfFiles$name |> str_extract("2[0-9]{5}")
  targetIdfFiles$year <- targetIdfFiles$ym |> str_sub(1, 4) |> as.numeric() 
  targetIdfFiles$month <- targetIdfFiles$ym |> str_sub(5, 6) |> as.numeric()
  targetYear <- idfVersion |> str_sub(1, 4) |> as.numeric()
  target <- targetIdfFiles |> filter((targetYear - 1) <= year & year <= targetYear)
  target$password <- NA
  for (i in 1:nrow(target)) {
    filename <- target[i, "name", drop=T] |> flatten_chr()
    target[i, "password"] <- GetIdfPassword(idfBoxDirInfo, filename)
  }
  res <- target
  return(res)
}

GetIdfPassword <- function(idfBoxDirInfo, inputFilename) {
  filename <- inputFilename |> str_remove(kZipExtention) |> str_c(kIdfPasswordFileFooter)
  targetIdfPasswordFile <- idfBoxDirInfo$zipId |> GetBoxTargetFiles(filename)
  if (nrow(targetIdfPasswordFile) != 1) {
    stop("The specified file is not found.")
  }
  res <- targetIdfPasswordFile[1, "id", drop=T] |> flatten_chr() |> box_read_tsv(header=F) %>% .[1, 1, drop=T]
  return(res)
}

whoddDownloadFilesFromBox <- function() {
  whoddBoxDirInfo <- GetTargetDirInfo(KWhoddBoxDirName, kWhoddZip)
  if (is.null(whoddBoxDirInfo$zipId)) {
    stop("The specified directory is not found.")
  }  
  whoddFileInfo <- GetLatestWhoddFile(whoddBoxDirInfo)
  whoddFileInfo$id |> box_dl(downloads_path, overwrite=T)  
  localPathWhodd <- whoddFileInfo$name %>% file.path(downloads_path, .)
  return(localPathWhodd)
}

GetIdfDownloadFilesInfoFromBox <- function() {
  idfBoxDirInfo <- GetTargetDirInfo(KIdfBoxDirName, kIdf)
  if (is.null(idfBoxDirInfo$zipId)) {
    stop("The specified directory is not found.")
  }  
  idfFileInfo <- GetTargetIdfFile(idfBoxDirInfo)
  return(idfFileInfo)
}

