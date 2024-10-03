#' functions for data analysis
#' 
#' @file common_function.R
#' @author Mariko Ohtsuka
#' @date 2024.10.3
# ------ libraries ------
library(tidyverse)
library(jsonlite)
# ------ constants ------
nhoHospName <- here("nhoHospname.txt") |> readLines()
nhoUid <- here("nho_uid.txt") |> readLines() |> as.data.frame() |> setNames("uid")
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
RemoveNonTargetAddresses <- function(address) {
  # 空白を一つも含まないものは地名とみなす
  if (!str_detect(address, "\\s")) {
    return("")
  }
  removeAddresses <- list(
    "[0-9]{7}", # 郵便番号
    "[0-9]+-[0-9]+", # ハイフン区切りの数字が入っていたら住所とみなす
    "^[0-9]+ [A-Za-z]+",
    "^[A-Za-z]+ [0-9]+",
    regex("Dept ", ignore_case = T),  # Dept～、Div～は部署とみなす
    regex("Div ", ignore_case = T), 
    regex(" Div$", ignore_case = T), 
    regex(" Dept$", ignore_case = T), 
    regex("Univ", ignore_case = T),  # 大学を除去
    regex("medical school", ignore_case = T), 
    regex("med sch", ignore_case = T), 
    regex("sch med", ignore_case = T), 
    regex("sch dent", ignore_case = T), 
    regex(" sci$", ignore_case = T), 
    regex(" sch$", ignore_case = T), 
    regex(" coll$", ignore_case = T),
    regex("Daigaku ", ignore_case = T), 
    regex(" ku$", ignore_case = T), # 区町名を除去
    regex(" cho$", ignore_case = T), 
    regex(" rosai hosp", ignore_case = T),  # 公立病院の類を除去, 
    regex("kobe city", ignore_case = T), 
    regex(" city hosp", ignore_case = T), 
    regex(" city med", ignore_case = T), 
    regex(" City Gen Hosp", ignore_case = T), 
    regex(" City General Hosp", ignore_case = T), 
    regex("city$", ignore_case = T), 
    regex("Prefectural", ignore_case = T), 
    regex("Prefecture", ignore_case = T), 
    regex("Municipal", ignore_case = T), 
    regex("Citizens Hosp", ignore_case = T), 
    regex("Metropolitan ", ignore_case = T), 
    regex("Japan Org ", ignore_case = T), 
    regex("Japan Community Hlth Care Org", ignore_case = T), 
    regex("Natl Canc Ctr", ignore_case = T), 
    regex("Canc Inst Hosp", ignore_case = T), 
    regex(" clin$", ignore_case = T),  # 診療所を除去, 
    regex("^clin ", ignore_case = T), 
    regex(" clin ", ignore_case = T), 
    regex(" ltd$", ignore_case = T),  # 企業を除去, 
    regex("Inc$", ignore_case = T), 
    regex("co\\.$", ignore_case = T), 
    regex("red cross", ignore_case = T), 
    regex("redcross", ignore_case = T), 
    regex("jcho ", ignore_case = T), 
    regex("assoc ", ignore_case = T), 
    regex("assoc$", ignore_case = T), 
    regex("japan$", ignore_case = T), 
    regex("NTT", ignore_case = F), 
    regex("JR ", ignore_case = F), 
    regex("JA ", ignore_case = F), 
    regex("KKR ", ignore_case = F), 
    regex("^Res Inst$", ignore_case = T), 
    regex(" Limited$", ignore_case = T), 
    regex(" Fdn$", ignore_case = T), 
    regex(" Fdn ", ignore_case = T), 
    regex(" Heart Center", ignore_case = T), 
    regex(" Heart Ctr", ignore_case = T), 
    regex(" Memorial Hospital", ignore_case = T), 
    regex(" Mem Hosp", ignore_case = T), 
    regex("Foundation", ignore_case = T), 
    regex("Eastern Chiba Med Ctr", ignore_case = T), 
    regex("Dev ", ignore_case = T), 
    regex("^Fac Med$", ignore_case = T), # 個別対応
    regex("^Hosp East$", ignore_case = T),
    regex("^sanno hosp$", ignore_case = T),
    regex("^Aichi Canc Ctr$", ignore_case = T),
    regex("^Aichi Cancer Center$", ignore_case = T),
    regex("^Kurashiki Central Hosp", ignore_case = T),
    regex("^Kurashiki Cent Hosp", ignore_case = T),
    regex("^Teine Keijinkai Hosp", ignore_case = T),
    regex("^Sapporo Keiyukai Hosp", ignore_case = T),
    regex("^Kikkoman Gen Hosp", ignore_case = T),
    regex("^Moriya Daiichi Gen Hosp", ignore_case = T),
    regex("^Shin Yurigaoka Gen Hosp", ignore_case = T),
    regex("^Suzuka Kaisei Hosp", ignore_case = T),
    regex("^Nikko Med Ctr$", ignore_case = T),
    regex("Cardiovasc Med & Nephrol", ignore_case = T),
    regex("Saiseikai ", ignore_case = T),
    regex("Inanami Spine & Joint Hosp", ignore_case = T),
    regex("Iguchi Perinatal & Obstet & Gynecol Hosp", ignore_case = T),
    regex("Mitoyo Gen Hosp", ignore_case = T),
    regex("Tsuyama Chuo Hosp", ignore_case = T),
    regex("Midori Hosp", ignore_case = T),
    regex("Sannochou Hosp", ignore_case = T),
    regex("Chuden Hosp", ignore_case = T),
    regex("Komagome Hosp", ignore_case = T),
    regex("Kawakita Gen Hosp", ignore_case = T),
    regex("Tachikawa Hosp", ignore_case = T),
    regex("Human Syst Design Lab", ignore_case = T),
    regex("Hills Joint Res Lab Future Prevent Med & Wellness", ignore_case = T),
    regex("Med AI Ctr", ignore_case = T),
    regex("Ctr Stress Res", ignore_case = T),
    regex("Grad Sch Syst Design & Management", ignore_case = T),
    regex("Off Radiat Technol", ignore_case = T),
    regex("Depe Hepatobiliary Pancreat Med", ignore_case = T),
    regex("Mazda Hosp", ignore_case = T),
    regex("Mazuda Hosp", ignore_case = T),
    regex("Seirei ", ignore_case = T),
    regex("Surg$", ignore_case = T),
    regex("Canc Treatment Ctr", ignore_case = T),
    regex("Comm Hereditary Colorectal Canc", ignore_case = T),
    regex("Japanese Soc Canc Colon & Rectum", ignore_case = T),
    regex("Dentistry and Pharmaceutical Sciences", ignore_case = T),
    regex("Kinki Cent Hosp", ignore_case = T),
    regex("Okayama East Neurosurg Hosp", ignore_case = T),
    regex("Iwasa Hosp", ignore_case = T),
    regex("Kyoundo Hosp", ignore_case = T),
    regex("Sendai Kousei Hosp", ignore_case = T),
    regex("Kanagawa Canc Ctr", ignore_case = T),
    regex("Aichi Canc Ctr", ignore_case = T),
    regex("Reg Ctr Japan Environm & Childrens Study", ignore_case = T),
    regex("^Natl Org Hosp$", ignore_case = T),
    regex("^Ctr Med Genet$", ignore_case = T),
    regex("Sci & ", ignore_case = T),
    regex("Intractable Dis Res Ctr", ignore_case = T),
    regex("Saitama Children's Medical Center", ignore_case = T),
    regex("Saitama Childrens Med Ctr", ignore_case = T),
    regex("Saitama Cardiovasc & Resp Ctr", ignore_case = T),
    regex("Saitama Med Ctr", ignore_case = T),
    regex("Saitama Medical Center", ignore_case = T),
    regex("Saitama Canc Ctr", ignore_case = T),
    regex("Yoshinaga Hosp", ignore_case = T),
    regex("^Gen Med Ctr$", ignore_case = T),
    regex("Minamino Cardiovasc Hosp", ignore_case = T),
    regex("Saitama Canc Ctr", ignore_case = T),
    regex("Hamamatsu Photon", ignore_case = T),
    regex("Preeminent Med Photon Educ & Res Ctr", ignore_case = T),
    regex("Hamamatsu PET Imaging Ctr", ignore_case = T),
    regex("Hamamatsu Med Imaging Ctr", ignore_case = T),
    regex("^Cent Res Lab$", ignore_case = T),
    regex("Toyoda Eisei Hosp", ignore_case = T),
    regex("Lab Drug Metab & Pharmacokinet", ignore_case = T),
    regex("Hlth & Med Serv Ctr", ignore_case = T),
    regex("Psychol Proc Res Team", ignore_case = T),
    regex("Guardian Robot Project", ignore_case = T),
    regex("Fac ", ignore_case = T),
    regex("Inst ", ignore_case = T),
    regex("Institute ", ignore_case = T),
    regex(" Inst$", ignore_case = T),
    regex("^Minato Lu$", ignore_case = T)
  )
  for (i in 1:length(removeAddresses)) {
    if (str_detect(address, removeAddresses[[i]])) {
      return("")
    }
  }
  return(address)
}
GetTargetUids <- function(input_list) {
  res <- input_list |> map( ~ .[1]) |> unique()
  names(res) <- res
  return(res)
}
GetCheckTarget1 <- function(input_list) {
  kTargetFoot <- c("Hosp", "Ctr", "Disorder", "Adult", "Adults", "Kagawa")
  checkTarget1 <- input_list |> map( ~ {
    res <- .
    hosptalNameFoot <- res[2] |> str_split(" ") |> list_c() %>% .[length(.)]
    if (!(hosptalNameFoot %in% kTargetFoot)) {
      return(NULL)
    }
    for (i in 1:length(nhoHospName)) {
      if (str_detect(res[2], regex(nhoHospName[i], ignore_case = T))) {
        return(res)
      }
    }
    return(NULL)
  }) |> discard( ~ is.null(.))
  return(checkTarget1)
}

GetCheckTarget2 <- function(input_list, excludeUids) {
  temp <- input_list |> map( ~ {
    res <- .
    if (is.null(excludeUids[[res[1]]])) {
      return(res)
    } else {
      return(NULL)
    }
  }) |> discard( ~ is.null(.))
  checkTarget2 <- temp |> map( ~ {
    res <- .
    res[2] <- res[2] |> RemoveNonTargetAddresses()
    return(res)
  }) |> discard( ~ .[2] == "")
  return(checkTarget2)
}
GetHospNamesForCheck1 <- function(checkTarget1, checkTarget1Uid) {
  checkTarget1Df <- checkTarget1 |> map_df( ~ .)
  checkTargetHospNames <- checkTarget1Uid |> map( ~ {
    input_data <- nonTarget[[.]]
    input_address <- input_data$addresses
    target_data <- checkTarget1Df |> filter(uid == .) %>% .$address
    fullAddress <- target_data |> map( ~ {
      tempHospName <- .
      res <- input_address |> map_if(~ !str_detect(., tempHospName) | . == tempHospName, ~ NULL)
      return(res)
    }) |> list_flatten() |> discard( ~ is.null(.)) |> list_c()
    res <- data.frame(address=fullAddress)
    res$uid <- .
    return(res)
  }) |> bind_rows() |> arrange(address, uid)
  return(checkTargetHospNames)
}
#' Get Raw Data from JSON File
#'
#' This function reads a JSON file from a specified input path, extracts the records, 
#' and returns a flattened list of records. It depends on the `GetHomeDir()` function 
#' to retrieve the user's home directory.
#'
#' @param kInputPath A string representing the path to the input JSON file, relative to the user's home directory.
#' @return A list containing the flattened records from the JSON file.
#' @importFrom purrr map list_flatten
#' @importFrom jsonlite read_json
#' @details This function relies on `GetHomeDir()` to obtain the home directory path.
#' Ensure that `GetHomeDir()` is defined and working correctly in your environment.
#' @examples
#' # Assuming the input JSON file exists at "data/raw.json"
#' raw_data <- GetRawData("data/raw.json")
GetRawData <- function(kInputPath) {
  homeDir <- GetHomeDir()
  rawDataPath <- file.path(homeDir, kInputPath)
  rawJson <- rawDataPath |> read_json()
  rec <- rawJson |> map( ~ .$Data$Records$records$REC) |> list_flatten()
  
}
GetAllAddresses <- function(addresses) {
  addressesOnlyJapan <- addresses |> map( ~ {
    res <- .
    if (!is.null(res$addresses$address_name$address_spec)) {
      temp <- res$addresses$address_name
      res$addresses$address_name <- list(temp)
    }
    temp <- res$addresses$address_name |> map( ~ {
      address_spec <- .$address_spec
      if (!str_detect(address_spec$country, regex("japan", ignore_case = T))) {
        return(NULL)
      }
      return(address_spec)
    }) |> discard( ~ is.null(.))
    res$addresses <- temp
    return(res)
  })
  allAddresses <- addressesOnlyJapan |> map( ~ {
    res <- .
    fullAddresses <- res$addresses |> map( ~ .$full_address)
    organizations <- res$addresses |> map( ~ {
      orgs <- .$organizations
      contents <- orgs$organization |> map( ~ .$content)
      return(contents)
    }) |> list_flatten()
    allAddresses <- list(fullAddresses, organizations) |> list_flatten()
    res$addresses <- allAddresses
    return(res)
  })
  return(allAddresses)
}