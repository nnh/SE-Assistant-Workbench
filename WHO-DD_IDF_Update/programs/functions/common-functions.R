#' Title: Common Functions
#'
#' Description: This script contains a set of utility functions commonly used across various R scripts.
#' @file common-functions.R
#' @author Mariko Ohtsuka
#' @date 2024.7.19

# ------ functions ------

#' Get configuration text
#'
#' This function reads a configuration file and assigns its contents to the global environment.
#' 
#' @return None. The function assigns values to the global environment.
#' @importFrom readr read_csv cols col_character
#' @importFrom here here
GetConfigText <- function() {
  configTextPath <- here("ext", "config.txt")
  configText <- tryCatch({
    read_csv(configTextPath, col_types = cols(
      .default = col_character()  # すべての列を文字列として読み込む
    ))
  }, error = function(e) {
    stop(paste("Error: Unable to read file -", configTextPath, "\n", e$message))
  })
  for (i in 1:nrow(configText)) {
    assign(configText[i, 1, drop=T], configText[i, 2, drop=T], envir = .GlobalEnv)
  }
  return()
}
#' Get home directory path
#'
#' This function returns the home directory path based on the operating system.
#' 
#' @return A string representing the home directory path.
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
#' Get folder path
#'
#' This function returns the full path to a specified folder in the home directory.
#' 
#' @param folder_name The name of the folder.
#' @return A string representing the full path to the specified folder.
GetFolderPath <- function(folder_name) {
  home_dir <- GetHomeDir()
  folder_path <- file.path(home_dir, folder_name)
  return(folder_path)
}
#' Get target files
#'
#' This function filters a list of files based on a specified pattern.
#' 
#' @param files A vector of file names.
#' @param textPattern A regex pattern to filter the files.
#' @return A vector of files that match the specified pattern.
#' @importFrom stringr str_extract na.omit
GetTargetFiles <- function(files, textPattern) {
  res <-  files |> str_extract(textPattern) |> na.omit()
  return(res)
}
#' Get target files list
#'
#' This function processes file names and returns a list with file path and modified file name.
#' 
#' @param filename A vector of file names.
#' @return A list containing file path and modified file name.
#' @importFrom stringr str_detect str_extract str_c str_remove
GetTargetFilesList <- function(filename) {
  if (length(filename) == 0) {
    return(NULL)
  }
  # BOXでファイル名に日本語が利用できないためIDFの場合ファイル名を変換する必要がある
  idfCheck <- str_detect(filename, kIdfFileNameString)
  if (idfCheck) {
    beforePath <- file.path(downloads_path, filename)
    outputFileName <- str_extract(filename, kIdfFileNameParts) |> str_c(kIdfAllFooter ,kZipExtention)
    filePath <- file.path(downloads_path, outputFileName)
    file.rename(beforePath, filePath)
  } else {
    outputFileName <- filename
    filePath <- file.path(downloads_path, filename)
  }
  res <- list(path=filePath, filename=str_remove(outputFileName, kZipExtention))
  return(res)
}
#' Get download files
#'
#' This function searches for specific types of files in the downloads directory.
#' 
#' @return A list of files with their paths and modified names.
#' @importFrom stringr str_c str_detect
GetDownloadFiles <- function() {
  zipFiles <- downloads_path |> list.files(pattern=str_c("*", kZipExtention))
  whodd <- zipFiles |> GetTargetFiles(str_c(kWhoddJapanCrtParts, ".*", kZipExtention, "$"))
  whoddZip <- zipFiles |> GetTargetFiles(str_c("(?i)^WHODrug\\s.*", kZipExtention ,"$"))
  idf <- zipFiles |> GetTargetFiles(kIdfFileNameString)
  if (length(whodd) > 1) {
    stop("Error: Multiple WHODrug zip files found. Please ensure that only one WHODrug zip file is present in the specified directory.")
  }
  if (length(idf) > 1) {
    stop("Error: Multiple idf zip files found. Please ensure that only one idf zip file is present in the specified directory.")
  }
  res <- list()
  res[[kIdf]] <- idf |> GetTargetFilesList()
  res[[kWhodd]] <- whodd |> GetTargetFilesList()
  res[[kWhoddZip]] <- whoddZip |> map( ~ GetTargetFilesList(.))
  return(res)
}
#' Create directory
#'
#' This function creates a specified directory, removing it first if it already exists.
#' 
#' @param targetDir The path to the directory to be created.
CreateDir <- function(targetDir) {
  if (dir.exists(targetDir)) {
    unlink(targetDir, recursive=T)
  }
  dir.create(targetDir)
}
#' Check if a list contains nested lists
#'
#' This function checks if a list contains any nested lists.
#' 
#' @param lst A list to check.
#' @return TRUE if the list contains nested lists, FALSE otherwise.
#' @importFrom purrr map_lgl
ContainsNestedList <- function(lst) {
  any(map_lgl(lst, is.list))
}
#' Find files in a directory
#'
#' This function recursively searches for files in a specified directory that match a given pattern.
#' 
#' @param directory The path to the directory.
#' @param filename The pattern to match file names.
#' @return A vector of file paths that match the pattern.
FindFiles <- function(directory, filename) {
  all_files <- list.files(path=directory, pattern=filename, recursive=T, full.names=T)
  return(all_files)
}
#' Find a folder within a specified directory and its subdirectories
#'
#' This function searches for a folder with the specified name within the given
#' base directory and its subdirectories. It returns the path(s) of the folder(s)
#' if found, otherwise returns NULL.
#'
#' @param base_path A character string specifying the path to the base directory where
#' the search should begin.
#' @param target_folder_name A character string specifying the name of the folder to search for.
#' @return A character vector of folder paths that match the target folder name. If no
#' matching folder is found, returns NULL.
#' @examples
#' # Example usage:
#' # base_path <- "your/base/directory/path"
#' # target_folder_name <- "test"
#' # result <- find_folder(base_path, target_folder_name)
#' # print(result)
#' @export
findFolder <- function(base_path, target_folder_name) {
  # Get a list of all directories within the base path, including subdirectories
  all_dirs <- list.dirs(base_path, recursive = TRUE, full.names = TRUE)
  
  # Filter directories to find the target folder
  target_dirs <- grep(paste0("/", target_folder_name, "$"), all_dirs, value = TRUE)
  
  # Return the paths of the target folder(s) if found, otherwise return NULL
  if (length(target_dirs) > 0) {
    return(target_dirs)
  } else {
    return(NULL)
  }
}
#' Get copy file information
#'
#' This function processes a list of target files and retrieves their paths and destination names.
#' 
#' @param targetList A list of target files with their details.
#' @return A list of files with their paths, destination names, and directories.
#' @importFrom purrr map
GetCopyFileInfo <- function(targetList) {
  copyFiles <- targetList |> map( ~ {
    fromName <- .$fromName
    toName <- .$toName
    awsDir <- .$toDir
    fromDir <- .$fromDir
    findFilePathAndToName <- fromDir |> FindFiles(fromName)
    if (length(findFilePathAndToName) == 0) {
      stop("File with the specified name does not exist.")
    }
    if (length(findFilePathAndToName) > 1) {
      stop("Multiple files with the same name.")
    }
    return(list(path=findFilePathAndToName, filename=toName, awsDir=awsDir))
  })  
  return(copyFiles)
}

