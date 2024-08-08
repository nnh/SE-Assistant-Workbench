#' AWS S3 Functions
#'
#' Description: This script includes functions to interact with AWS S3, including setting up the environment and uploading files to specified S3 folders.
#' @file s3-functions.R
#' @author Mariko Ohtsuka
#' @date 2024.8.8
# ------ libraries ------
library("aws.s3")
# ------ constants ------
# ------ functions ------
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

UploadDirectoryToS3 <- function(local_dir, aws_dir) {
  files_and_dirs <- dir_ls(local_dir, recurse=T)
  
  for (i in 1:length(files_and_dirs)) {
    item <- files_and_dirs[i]
    relative_path <- path_rel(item, start=local_dir)
    s3_key <- path(aws_dir, relative_path)
    
    if (dir_exists(item)) {
      put_object(what=raw(0), object=paste0(s3_key, "/"), bucket=kAwsBucketName, region=kAwsDefaultRegion)
    } else {
      file_size <- file.info(item)$size
      if (file_size > 5 * 1024 * 1024) {  # 5MBを超える場合はマルチパートアップロードを推奨
          put_object(file = item, object = s3_key, bucket = kAwsBucketName, region = kAwsDefaultRegion, multipart = TRUE)
      } else {
          put_object(file = item, object = s3_key, bucket = kAwsBucketName, region = kAwsDefaultRegion)
      }
    }
  }
}

