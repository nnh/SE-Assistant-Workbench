#' Title: BOX File Management
#'
#' Description: This script includes functions to interact with BOX directories and save zip files to specified folders in BOX.
#' @file box-file-management.R
#' @author Mariko Ohtsuka
#' @date 2024.7.19
# ------ libraries ------
library(boxr)
# ------ constants ------
# ------ functions ------
#' Get Target BOX Directory
#'
#' This function sets the working directory to a specified BOX directory ID and retrieves information about the directory's contents.
#' 
#' @param id The BOX directory ID.
#' @return A data frame containing information about the contents of the specified BOX directory.
GetTargetBoxDir <- function(id) {
  tryCatch({
    box_setwd(id)
  }, error = function(e) {
    stop(paste("Error: Unable dir id -", kCodingDirId, "\n", e$message))
  })
  dirInfo <- box_ls()
  if (length(dirInfo) == 0) {
    return(tibble(type = character(), id = character(), name = character()))
  }
  df_dirInfo <- dirInfo |> map( ~ c(type=.$type, id=.$id, name=.$name)) |>
    map(~ unlist(.)) |>
    transpose() |>
    as_tibble()
  return(df_dirInfo)
}
#' Get Target Directory Information
#'
#' This function retrieves information about a target directory and its contents from BOX.
#' 
#' @param folderName The name of the target folder.
#' @param listName The name of the list to store the folder information.
#' @return A list containing the ID and name of the target folder and its subdirectory.
GetTargetDirInfo <- function(folderName, listName) {
  df_parentDirInfo <- GetTargetBoxDir(kCodingDirId)
  dirInfo <- df_parentDirInfo |> filter(type == "folder" & name == folderName)
  res <- list()
  if (nrow(dirInfo) == 0) {
    return(res)
  } else {
    res$id <- dirInfo[1, "id", drop=T] |> flatten_chr()
    res$name <- dirInfo[1, "name", drop=T] |> flatten_chr()
    df_zipDirInfo <- GetTargetBoxDir(res$id)
    zipDirInfo <- df_zipDirInfo |> filter(type == "folder" & name == kZipDirName)
    if (nrow(zipDirInfo) == 0) {
      box_dir_create(kZipDirName, res$id)
      df_zipDirInfo <- GetTargetBoxDir(res$id)
      zipDirInfo <- df_zipDirInfo |> filter(type == "folder" & name == kZipDirName)
    }
    res$zipId <- zipDirInfo[1, "id", drop=T] |> flatten_chr()
    res$zipName <- zipDirInfo[1, "name", drop=T] |> flatten_chr()
  }
  if (length(res) == 0) {
    stop("The folder specified in Box does not exist.")
  }
  return(res)
}

#' Save Zip File to BOX
#'
#' This function saves a zip file to a specified folder in BOX.
#' 
#' @param folderName The name of the target folder in BOX.
#' @param listName The name of the list containing the file information.
#' @return Information about the target directory in BOX where the file was saved.
SaveZipToBox <- function(folderName, listName) {
  if (!listName %in% names(file_list)) {
    return()
  }  
  boxDirInfo <- GetTargetDirInfo(folderName, listName)
  if (ContainsNestedList(file_list[[listName]])) {
    zipList <- file_list[[listName]]
  } else {
    zipList <- file_list[[listName]] |> list()
  }
  dummy <- zipList |> map( ~ box_ul(dir_id=boxDirInfo$zipId, .$path, pb=T))
  return(boxDirInfo)
}

#' Save Zip File to Common Directory in BOX
#'
#' This function saves a zip file to a common directory in BOX.
#' 
#' @param boxDirName The name of the common directory in BOX.
#' @param listName The name of the list containing the file information.
#' @return Information about the target directory in BOX where the file was saved.
SaveZipCommon <- function(boxDirName ,listName) {
  if (!listName %in% names(file_list)) {
    return()
  }
  res <- SaveZipToBox(boxDirName, listName)
  return(res)
}
#' Print ZIP and password (txt) file names in a BOX folder
#'
#' This function lists the ZIP and txt (password) file names in a BOX folder matching the given pattern and prints them.
#'
#' @param dirId The BOX folder ID to list.
#' @param pattern A regular expression to filter file names. Defaults to any zip or txt file.
#' @return None.
PrintBoxZipFileNames <- function(dirId, pattern = str_c("(", kZipExtention, "|\\.txt)$")) {
  fileNames <- GetTargetBoxDir(dirId) |> filter(type == "file" & str_detect(name, pattern)) |> pull(name) |> flatten_chr()
  cat(fileNames, sep = "\n")
}

#' Get or create a BOX subfolder by name
#'
#' This function searches for a subfolder by name under a given parent folder, creating it if it does not exist.
#'
#' @param parentId The BOX folder ID to search within.
#' @param folderName The name of the subfolder to find or create.
#' @return The ID of the subfolder.
GetOrCreateBoxSubDir <- function(parentId, folderName) {
  dirInfo <- GetTargetBoxDir(parentId) |> filter(type == "folder" & name == folderName)
  if (nrow(dirInfo) == 0) {
    box_dir_create(folderName, parentId)
    dirInfo <- GetTargetBoxDir(parentId) |> filter(type == "folder" & name == folderName)
  }
  return(dirInfo[1, "id", drop = T] |> flatten_chr())
}

#' Get or create a nested BOX folder path
#'
#' This function resolves a nested folder path under a given parent folder, creating any missing folders along the way.
#'
#' @param parentId The BOX folder ID to start from.
#' @param pathParts A character vector of folder names, in order.
#' @return The ID of the final folder in the path.
GetOrCreateBoxDirPath <- function(parentId, pathParts) {
  dirId <- parentId
  for (folderName in pathParts) {
    dirId <- GetOrCreateBoxSubDir(dirId, folderName)
  }
  return(dirId)
}

#' Upload extracted files to BOX
#'
#' This function uploads a list of files to their specified nested folder paths in BOX, under a common parent directory.
#' Files are staged in a temporary ASCII-safe directory under their target filename before upload, since BOX
#' rejects uploads whose local path cannot be converted to ASCII (e.g. source paths containing Japanese folder names).
#'
#' @param copyFiles A list of files to upload. Each element should have: path, filename, boxDir (character vector of folder names).
#' @param parentId The BOX folder ID under which the folder structure is created.
#' @return None. Files that already exist at the destination are skipped.
UploadToBox <- function(copyFiles, parentId) {
  for (i in 1:length(copyFiles)) {
    path <- copyFiles[[i]]$path
    filename <- copyFiles[[i]]$filename
    boxDir <- copyFiles[[i]]$boxDir
    dirId <- GetOrCreateBoxDirPath(parentId, boxDir)
    existingFile <- GetTargetBoxDir(dirId) |> filter(type == "file" & name == filename)
    if (nrow(existingFile) > 0) {
      cat(str_c(filename, " already exists. Skipping.\n"))
      next
    }
    uploadPath <- file.path(tempdir(), filename)
    file.copy(path, uploadPath, overwrite = TRUE)
    box_ul(dir_id = dirId, uploadPath, pb = TRUE)
  }
}

BoxAuthSettings <- function() {
  kBoxClientId <<- readline(prompt = "Enter BOX Client ID and press Enter: ")
  kBoxClientSecret <<- readline(prompt = "Enter BOX Client Secret and press Enter: ")
}
BoxAuth <- function() {
  box_auth(client_id=kBoxClientId, client_secret=kBoxClientSecret)
}
