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
  if (length(boxDirInfo) == 0) {
    stop("The folder specified in Box does not exist.")
  }
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

# ------ main ------
### Box authenticate ###
kClientId <- readline(prompt = "Enter BOX Client ID and press Enter: ")
kClientSecret <- readline(prompt = "Enter BOX Client Secret and press Enter: ")
box_auth(client_id = kClientId, client_secret = kClientSecret)
