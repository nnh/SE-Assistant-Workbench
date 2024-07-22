#' AWS S3 Functions
#'
#' Description: This script includes functions to interact with AWS S3, including setting up the environment and uploading files to specified S3 folders.
#' @file s3-functions.R
#' @author Mariko Ohtsuka
#' @date 2024.7.22
# ------ libraries ------
library("aws.s3")
# ------ constants ------
# ------ functions ------
#' Get R Environment
#'
#' This function sets up the AWS credentials in the .Renviron file if it does not already exist.
#' It reads the AWS access key ID, secret access key, and default region from the user.
#' 
#' @return None
GetREnviron <- function() {
  home_dir <- GetHomeDir()
  renv_file <- file.path(home_dir, ".Renviron")
  
  # .Renviron ファイルの存在を確認
  if (!file.exists(renv_file)) {
    if (!exists("kAwsDefaultRegion")) {
      stop("Error: Please add 'kAwsDefaultRegion' to the config and re-run.")
    }
    cat(".Renviron file not found. Creating .Renviron file...\n")
    
    aws_key <- readline(prompt = "Enter your AWS access key ID: ")
    aws_secret <- readline(prompt = "Enter your AWS secret access key: ")
    
    writeLines(sprintf("AWS_ACCESS_KEY_ID=%s", aws_key), con = renv_file)
    cat(sprintf("AWS_SECRET_ACCESS_KEY=%s\n", aws_secret), file = renv_file, append = TRUE)
    cat(sprintf("AWS_DEFAULT_REGION=%s\n", kAwsDefaultRegion), file = renv_file, append = TRUE)
    
  }
  readRenviron(renv_file)
}

#' Upload to S3 Folder
#'
#' This function uploads a file to a specified folder in an S3 bucket.
#' 
#' @param folder_name The name of the target folder in the S3 bucket.
#' @param file_path The path to the file to be uploaded.
#' @param object_name The name of the object in the S3 bucket.
#' @return A logical value indicating whether the upload was successful.
UploadToS3Folder <- function(folder_name, file_path, object_name) {
  if (substr(folder_name, nchar(folder_name), nchar(folder_name)) != "/") {
    folder_name <- paste0(folder_name, "/")
  }
  full_object_name <- paste0(folder_name, object_name)
  res <- put_object(
    file = file_path, 
    object = full_object_name, 
    bucket = kAwsBucketName
  )
  return(res)
}

#' Upload to S3
#'
#' This function uploads a list of files to their specified directories in an S3 bucket.
#' 
#' @param copyFiles A list of files to be uploaded. Each element of the list should be a list with the following elements: path, filename, and awsDir.
#' @return None
UploadToS3 <- function(copyFiles) {
  for (i in 1:length(copyFiles)) {
    path <- copyFiles[[i]]$path
    filename <- copyFiles[[i]]$filename
    awsDir <-  copyFiles[[i]]$awsDir
    res <- UploadToS3Folder(awsDir, path, filename)
    if (!res) {
      stop("aws push error.")
    }
  }
}
