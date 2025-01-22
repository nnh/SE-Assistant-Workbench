#' title
#' VISITシート、各シート間で違うところを洗い出す
#' @file xxx.R
#' @author Mariko Ohtsuka
#' @date YYYY.MM.DD
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
library(jsonlite)
# ------ constants ------
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
# ------ main ------
homeDir <- GetHomeDir()
inputDir <- homeDir |> file.path("Documents\\GitHub\\ptosh-json-to-excel\\input_gpower")
inputJson <- inputDir |> list.files(full.names=T)
targetJson <- inputJson |> str_extract("^.*1st_trt_.*") |> na.omit()
jsonFiles <- list()
for (i in 1:10) {
  jsonFiles[[i]] <- read_json(targetJson[i])
  
}
temp <- targetJson |> map_vec( ~ basename(.))
names(jsonFiles) <- temp

testNames <- jsonFiles |> map( ~ names(.)) |> unlist() |> unique()


baseDf <- jsonFiles |> map_df( ~ {
  temp <- .
  temp$field_items <- NULL
  temp$cdisc_sheet_configs <- NULL
  temp$visit <- NULL
  aliasname <- temp$alias_name
  df <- data.frame()
  df[1, 1] <- 'id'
  df[2, 1] <- 'trial_id'
  df[3, 1] <- 'name'
  df[4, 1] <- 'alias_name'
  df[5, 1] <- 'stylesheet'
  df[6, 1] <- 'fax_stylesheet'
  df[7, 1] <- 'javascript'
  df[8, 1] <- 'category'
  df[9, 1] <- 'seq'
  df[10, 1] <- 'images_count'
  df[11, 1] <- 'lab_department_id'
  df[12, 1] <- 'is_locked'
  df[13, 1] <- 'is_serious'
  df[14, 1] <- 'is_closed'
  df[15, 1] <- 'odm'
  df[16, 1] <- 'registration_config'
  df[17, 1] <- 'source_id'
  df[18, 1] <- 'uuid'
  df[19, 1] <- 'created_at'
  df[20, 1] <- 'updated_at'
  df[21, 1] <- 'digest'
  df[22, 1] <- 'lock_version'
  df[1, 2] <- temp$id
  df[2, 2] <- temp$trial_id
  df[3, 2] <- temp$name
  df[4, 2] <- temp$alias_name
  df[5, 2] <- temp$stylesheet
  df[6, 2] <- temp$fax_stylesheet
  df[7, 2] <- ifelse(is.null(temp$javascript), NA, temp$javascript)
  df[8, 2] <- temp$category
  df[9, 2] <- temp$seq
  df[10, 2] <- temp$images_count
  df[11, 2] <- ifelse(is.null(temp$lab_department_id), NA, temp$lab_department_id)
  df[12, 2] <- temp$is_locked
  df[13, 2] <- temp$is_serious
  df[14, 2] <- temp$is_closed
  df[15, 2] <- ifelse(length(temp$odm) == 0, NA, temp$odm)
  df[16, 2] <- ifelse(length(temp$registration_config) == 0, NA, temp$registration_config)
  df[17, 2] <- ifelse(is.null(temp$source_id), NA, temp$source_id)
  df[18, 2] <- temp$uuid
  df[19, 2] <- temp$created_at
  df[20, 2] <- temp$updated_at
  df[21, 2] <- temp$digest
  df[22, 2] <- temp$lock_version
  df[, 3] <- temp$alias_name
  return(df)
})
# id, aliasname, seq, uuid, time, digest, lockversionが違う
#id_df <- baseDf |> filter(V1=='id')
trial_id_df <- baseDf |> filter(V1=='trial_id')
name_df <- baseDf |> filter(V1=='name')
#alias_name_df <- baseDf |> filter(V1=='alias_name')
stylesheet_df <- baseDf |> filter(V1=='stylesheet')
fax_stylesheet_df <- baseDf |> filter(V1=='fax_stylesheet')
javascript_df <- baseDf |> filter(V1=='javascript')
category_df <- baseDf |> filter(V1=='category')
#seq_df <- baseDf |> filter(V1=='seq')
images_count_df <- baseDf |> filter(V1=='images_count')
lab_department_id_df <- baseDf |> filter(V1=='lab_department_id')
is_locked_df <- baseDf |> filter(V1=='is_locked')
is_serious_df <- baseDf |> filter(V1=='is_serious')
is_closed_df <- baseDf |> filter(V1=='is_closed')
odm_df <- baseDf |> filter(V1=='odm')
registration_config_df <- baseDf |> filter(V1=='registration_config')
source_id_df <- baseDf |> filter(V1=='source_id')
#uuid_df <- baseDf |> filter(V1=='uuid')
#created_at_df <- baseDf |> filter(V1=='created_at')
#updated_at_df <- baseDf |> filter(V1=='updated_at')
#digest_df <- baseDf |> filter(V1=='digest')
#lock_version_df <- baseDf |> filter(V1=='lock_version')
### 
# visitは全部違う
visit <- jsonFiles |> map( ~ .$visit)
### cdisc sheet configは全部同じみたい
cdiscSheetConfig <- jsonFiles |> map( ~ {
  aliasname <- .$alias_name
  temp <- .$cdisc_sheet_config
  temp2 <- temp |> map( ~ {
    tablename <- names(.$table)
    table <- .$table
    prefix <- .$prefix
    df <- data.frame()
    for (i in 1:length(tablename)) {
      df[i, 1] <- tablename[i]
      df[i, 2] <- table[i]
      df[i, 3] <- prefix
      df[i, 4] <- aliasname
    }
    return(df)
  })
  res <- temp2[[1]]
  colnames(res) <- c("V1", "V2", "V3", "V4")
  for (i in 2:length(temp2)) {
    temp3 <- temp2[[i]]
    colnames(temp3) <- c("V1", "V2", "V3", "V4")
    res <- res |> bind_rows(temp3)
  }
  return(res)
})
testCdiscSheetConfig <- cdiscSheetConfig |> map( ~ select(., -"V4"))
for (i in 2:length(testCdiscSheetConfig)) {
  identical(testCdiscSheetConfig[[i - 1]], testCdiscSheetConfig[[i]]) |> print()
}
# field items
# flip_flopsは一致しない, それ以外は一致
fieldItems <- jsonFiles |> map( ~ .$field_items)
testfFieldItems1 <- fieldItems |> map( ~ {
  temp <- .
  temp2 <- temp |> map( ~ {
    res <- .
    res$id <- NULL
    res$sheet_id <- NULL
    return(res)
  })
  return(temp2)
})
testfFieldItems <- testfFieldItems1 |> map( ~ {
  temp <- .
  temp2 <- temp |> map( ~ {
    res <- .
    res$flip_flops <- NULL
    return(res)
  })
  return(temp2)
})
for (i in 1:(length(testfFieldItems)-1)) {
  for (j in 1:(length(testfFieldItems[[i]]))) {
    test1 <- testfFieldItems[[i]][[j]]
    test2 <- testfFieldItems[[i+1]][[j]]
    if (!identical(test1, test2)) {
      print("diff")
      print(test1)
      print(test2)
      stop()
    }
  }
}
# flip_flopsはid, fielditemIdが異なる
flipflops <- testfFieldItems1 |> map( ~ {
  temp <- .
  temp2 <- temp |> map( ~ {
    flipflop <- .$flip_flops
    if (length(flipflop) > 0) {
      return(flipflop)
    } else {
      return(NULL)
    }
  }) |> keep( ~ !is.null(.))
  
  return(temp2)
})
testFlipFlops <- flipflops |> map( ~ {
  res <- . |> flatten() |> flatten()
  res$id <- NULL
  res$field_item_id <- NULL
  res2 <- res
  return(res2)
})
for (i in 1:(length(testFlipFlops)-1)) {
  print(identical(testFlipFlops[[i]], testFlipFlops[[i+1]]))
}
