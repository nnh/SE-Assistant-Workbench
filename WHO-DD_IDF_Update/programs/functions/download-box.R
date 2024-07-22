#' title
#' description
#' @file download-box.R
#' @author Mariko Ohtsuka
#' @date 2024.7.22
# ------ libraries ------
# ------ constants ------
# ------ functions ------
GetLatestTargetFiles <- function(id, pattern) {
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
  targetWhoddFiles <- whoddBoxDirInfo$zipId |> GetLatestTargetFiles(str_c(kWhoddJapanCrtParts, "\\s2[0-9]{3}\\s[A-Z][a-z]{2}\\s[0-9]", kZipExtention))
  targetWhoddFiles$ym <- targetWhoddFiles$name  |> str_replace(" Mar ", "03") |> str_replace(" Sep ", "09") |> 
    trimws() |> str_extract("2[0-9]{6}") |> as.numeric()
  res <- targetWhoddFiles |> GetLatestFileInfo()
}

GetLatestIdfFile <- function(idfBoxDirInfo) {
  targetIdfFiles <- idfBoxDirInfo$zipId |> GetLatestTargetFiles(str_c(kIdfFileNameParts, kIdfAllFooter, kZipExtention))
  targetIdfFiles$ym <- targetIdfFiles$name |> str_extract("2[0-9]{5}") |> as.numeric()
  res <- targetIdfFiles |> GetLatestFileInfo()
}

GetIdfPasswordFile <- function(idfBoxDirInfo, idfFileInfo) {
  filename <- idfFileInfo$name |> str_remove(kZipExtention) |> str_c(kIdfPasswordFileFooter)
  targetIdfPasswordFile <- idfBoxDirInfo$zipId |> GetLatestTargetFiles(filename)
  id <- targetIdfPasswordFile[1, "id", drop=T] |> flatten_chr()
  name <- targetIdfPasswordFile[1, "name", drop=T] |> flatten_chr()
  return(list(id=id, name=name))
  
}

DownloadFilesFromBox <- function() {
  whoddBoxDirInfo <- GetTargetDirInfo(KWhoddBoxDirName, kWhoddZip)
  idfBoxDirInfo <- GetTargetDirInfo(KIdfBoxDirName, kIdf)
  if (is.null(whoddBoxDirInfo$zipId) || is.null(idfBoxDirInfo$zipId)) {
    stop("The specified directory is not found.")
  }  
  whoddFileInfo <- GetLatestWhoddFile(whoddBoxDirInfo)
  idfFileInfo <- GetLatestIdfFile(idfBoxDirInfo)
  idfPasswordFileInfo <- GetIdfPasswordFile(idfBoxDirInfo, idfFileInfo)
  idfUnzipPassword <- idfPasswordFileInfo$id |> box_read_tsv(header=F) %>% .[1, 1, drop=T]
  whoddFileInfo$id |> box_dl(downloads_path, overwrite=T)  
  idfFileInfo$id |> box_dl(downloads_path, overwrite=T)  
  localPathWhodd <- whoddFileInfo$name %>% file.path(downloads_path, .)
  localPathIdf <- idfFileInfo$name %>% file.path(downloads_path, .)
  return(list(whodd=localPathWhodd, idf=localPathIdf, idfPassword=idfUnzipPassword))
}

