#' functions for data analysis
#' 
#' @file common_function.R
#' @author Mariko Ohtsuka
#' @date 2024.10.10
# ------ libraries ------
library(jsonlite)
library(rvest)
library(googlesheets4)
# ------ constants ------
configJson <- here("config.json") |> read_json()
outputSpreadSheetId <- configJson$outputSpreadSheetId
outputSheetNames <- configJson$sheetNames |> list_flatten()
nhoHospName <- here("nhoHospname.txt") |> readLines()
nhoUid <- here("nho_uid.txt") |> readLines() |> as.data.frame() |> setNames("uid")
# ------ functions ------
CreateSheets <- function(sheetName) {
  sheet_list <- sheet_names(outputSpreadSheetId)
  # シートが存在するか確認
  if (!(sheetName %in% sheet_list)) {
    # シートが存在しない場合、新しいシートを作成
    sheet_add(outputSpreadSheetId, sheet = sheetName)
  }
}
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
  # NHO病院が一つも入っていなかったレコードのリストを取得する
  nonTargetUidAndAddresses <- input_list |> map( ~ {
    uid <- .$uid
    addresses <- .$addresses |> list_flatten() |> map( ~ str_split(., ",")) |> unlist() |> trimws()|> unique() |> as.list()
    res <- addresses |> map( ~ c(uid=uid, address=.))
    return(res)
  }) |> list_flatten()

  kTargetFoot <- c("Hosp", "Ctr", "Disorder", "Adult", "Adults", "Kagawa")
  # NHO病院である可能性がある施設名が入っていたらcheckTarget1に格納
  checkTarget1 <- nonTargetUidAndAddresses |> map( ~ {
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
  # NHO病院である可能性がある施設名が入っているUIDのリスト
  checkTarget1Uid <- GetTargetUids(checkTarget1)
  # NHO病院であるかどうかを完全な施設名から確認する
  checkTargetHospNames <- GetHospNamesForCheck1(checkTarget1, checkTarget1Uid)
  return(list(checkTarget1=checkTarget1, checkTarget1Uid=checkTarget1Uid, checkTargetHospNames=checkTargetHospNames, nonTargetUidAndAddresses=nonTargetUidAndAddresses))
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
  checkTargetHospNames <- checkTarget1Uid |>
    map(~ {
      input_data <- nonTarget[[.]]
      input_address <- input_data$addresses
      target_data <- checkTarget1Df |>
        filter(uid == .) %>%
        .$address
      fullAddress <- target_data |>
        map(~ {
          tempHospName <- .
          res <- input_address |> map_if(~ !str_detect(., tempHospName) | . == tempHospName, ~NULL)
          return(res)
        }) |>
        list_flatten() |>
        discard(~ is.null(.)) |>
        list_c()
      res <- data.frame(address = fullAddress)
      res$uid <- .
      return(res)
    }) |>
    bind_rows() |>
    arrange(address, uid)
  # 水戸協同病院を除外する
  checkTargetHospNames <- ExcludeTsukubaUniv(checkTargetHospNames)
  # 帝京大学 ちば総合医療センターを除外する
  checkTargetHospNames <- checkTargetHospNames |> filter(!str_detect(address, regex("Teikyo Univ.*Chiba Med Ctr", ignore_case = T)))

  return(checkTargetHospNames)
}
#' Get Raw Data from JSON File
#'
#' This function reads a JSON file from a specified input path, extracts the records, 
#' and returns a flattened list of records. 
#'
#' @param kInputPath A string representing the path to the input JSON file, relative to the user's home directory.
#' @return A list containing the flattened records from the JSON file.
#' @importFrom purrr map list_flatten
#' @importFrom jsonlite read_json
#' @examples
#' # Assuming the input JSON file exists at "data/raw.json"
#' raw_data <- GetRawData("data/raw.json")
GetRawData <- function(kInputPath) {
  rawJson <- kInputPath |> read_json()
  rec <- rawJson |>
    map(~ .$Data$Records$records$REC) |>
    list_flatten()
  names(rec) <- rec |> map_chr( ~ .$UID)
  return(rec)
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
  allAddresses <- addressesOnlyJapan |> map(~ {
    res <- .
    fullAddresses <- res$addresses |> map(~ .$full_address)
    organizations <- res$addresses |>
      map(~ {
        orgs <- .$organizations
        contents <- orgs$organization |> map(~ .$content)
        return(contents)
      }) |>
      list_flatten()
    allAddresses <- list(fullAddresses, organizations) |> list_flatten()
    res$addresses <- allAddresses
    return(res)
  })
  allAddressesUids <- allAddresses |> map(~ .$uid)
  names(allAddresses) <- allAddressesUids
  return(allAddresses)
}
GetAddresses <- function(input_list) {
  addresses <- input_list |> map( ~ list(uid=.$UID, addresses=.$static_data$fullrecord_metadata$addresses))
  allAddresses <- addresses |> GetAllAddresses()
  return(list(addresses=addresses, allAddresses=allAddresses))
}
ExcludeTsukubaUniv <- function(checkTargetHospNames) {
  tsukubaUnivList <- c("WOS:001092684400002", "WOS:001082683100003") %>% data.frame(uid=.)
  checkTsukubaUniv <- checkTargetHospNames |> filter(str_detect(address, regex("Mito Med Ctr", ignore_case = T)))
  checkTsukubaUniv <- checkTsukubaUniv |> filter(str_detect(address, regex("Univ", ignore_case = T)) | str_detect(address, regex("Mito Kyodo", ignore_case = T)))
  tempTsukubaUniv <- checkTargetHospNames |> inner_join(tsukubaUnivList, by="uid")
  checkTsukubaUniv <- checkTsukubaUniv |> bind_rows(tempTsukubaUniv)
  checkTargetHospNames <- checkTsukubaUniv %>% anti_join(checkTargetHospNames, ., by=c("uid", "address"))
  return(checkTargetHospNames)
}
CheckNhoFacilityName <- function(address) {
  checkNho <- address |> str_detect(regex("Natl Hosp Org", ignore_case = T)) |> any()
  if (checkNho) {
    return(address)
  }
  checkNho <- address |> str_detect(regex("NHO ", ignore_case = T)) |> any()
  if (checkNho) {
    return(address)
  }
  checkNho <- address |> str_detect(regex("NHO,", ignore_case = T)) |> any()
  if (checkNho) {
    return(address)
  }
  return(NULL)
}
ClearAndWriteSheet <- function(sheet_name, data) {
  range_clear(outputSpreadSheetId, sheet = sheet_name)
  sheet_write(data, outputSpreadSheetId, sheet = sheet_name)
}
GetPublicationsWosId <- function(url) {
  html_file <- url |> read_html()
  # 'WOS:'で始まるIDを持つdiv要素を全て取得
  div_elements <- html_file |> html_nodes(xpath = "//*[starts-with(@id, 'WOS:')]")
  div_ids <- div_elements |> html_attr("id")
  return(div_ids)
}
GetPublicationsWosIds <- function(inputPath) {
  htmlFiles <- inputPath |> list.files(full.names=T) |> str_extract("^.*\\\\publication_[0-9]{4}_[0-9]{2}\\.html$") |> na.omit()
  htmlYm <- htmlFiles |> basename() |> str_remove("publication_") |> str_remove("\\.html") |> str_remove("_")
  res <- htmlFiles |> map( ~ GetPublicationsWosId(.))
  names(res) <- htmlYm
  return(res)  
}
FilterTargetGroups <- function(input_list) {
  target <- input_list |> map( ~ {
    res <- .
    checkAddress <- CheckNhoFacilityName(res$addresses)
    if (!is.null(checkAddress)) {
      return(res)
    }
    checkNho <- nhoUid |> filter(uid == res$uid)
    if (nrow(checkNho) > 0) {
      return(res)
    }
    return(NULL)
  }) |> discard( ~ is.null(.))
  targetUids <- target |> map( ~ .$uid)
  names(target) <- targetUids
  names(targetUids) <- targetUids
  nonTarget <- input_list |> map( ~ {
    res <- .
    if (is.null(targetUids[[res$uid]])) {
      return(res)
    } else {
      return(NULL)
    }
  }) |> discard( ~ is.null(.))
  names(nonTarget) <- nonTarget |> map_chr( ~ .$uid)
  return(list(target=target, nonTarget=nonTarget, targetUids=targetUids))
}
ExportToGlobal <- function(input_list) {
  dummy <- names(input_list) |> map(~ assign(., input_list[[.]], envir = globalenv()))
}
ExecCheckTarget1 <- function(checkTargetHospNames) {
  htmlOutputRecords <- data.frame(uid = character(), address = character(), targetDate = character())
  nonHtmlOutputRecords <- data.frame(uid = character(), address = character())
  if (length(checkTargetHospNames) == 0) {
    return(list(htmlOutputRecords=htmlOutputRecords, nonHtmlOutputRecords=nonHtmlOutputRecords))
  }
  for (i in 1:nrow(checkTargetHospNames)) {
    targetDate <- allPapers |> filter(uid == checkTargetHospNames[i, "uid"]) %>% .$targetDate
    if (length(targetDate) == 0) {
      print(str_c("allPapersに出力なし：uid=", checkTargetHospNames[i, "uid"], " 施設名：", checkTargetHospNames[i, "address"]))
    } else {
      if (!is.na(targetDate)) {
        targetHtmlUids <- htmlWosIdList[[targetDate]]
        if (checkTargetHospNames[i, "uid"] %in% targetHtmlUids) {
          temp <- checkTargetHospNames[i, ]
          temp$targetDate <- targetDate
          htmlOutputRecords <- htmlOutputRecords |> bind_rows(temp)
        } else {
          nonHtmlOutputRecords <- nonHtmlOutputRecords |> bind_rows(checkTargetHospNames[i, ])
        }
      } else {
        print(str_c("targetDateなし：uid=", checkTargetHospNames[i, "uid"], " 施設名：", checkTargetHospNames[i, "address"]))
      }
    }
  }
  warning("error:checkTarget1")
  if (nrow(htmlOutputRecords) > 0) {
    htmlOutputRecords <- htmlOutputRecords |> arrange(uid)
  }
  return(list(htmlOutputRecords=htmlOutputRecords, nonHtmlOutputRecords=nonHtmlOutputRecords))
}
GetOoForCheckTarget3 <- function(address_spec) {
  temp_oo <- address_spec$organizations$organization |> map( ~ {
    organization <- .
    content <- organization$content
    temp <- CheckNhoFacilityName(content)
    if (!is.null(temp)) {
      return(.$content)
    }
    temp <- facilityData |> filter(str_detect(facilityNameLower, tolower(content)) & category == "OO")
    if (nrow(temp) > 0){
      return(.$content)
    }
    return(NULL)
  }) |> discard( ~ is.null(.))
  if (length(temp_oo) > 0) {
    oo <- temp_oo
  } else {
    oo <- NULL
  }
  return(oo)  
}
GetAdForCheckTarget3 <- function(address_spec) {
  temp <- CheckNhoFacilityName(address_spec$full_address)
  if (!is.null(temp)) {
    ad <- address_spec$full_address
  } else {
    ad_list <- address_spec$full_address |> str_split_1(", ") |> map_if( ~ str_detect(., "^\\S+$"), ~ NULL) |> discard( ~ is.null(.))
    temp_ad <- ad_list |> map( ~ {
      adPart <- .
      temp <- facilityData |> filter(str_detect(facilityNameLower, tolower(adPart)) & category == "AD")
      return (nrow(temp) > 0)
    }) |> list_c()
    if (any(temp_ad)) {
      ad <- address_spec$full_address
    } else {
      ad <- NULL
    }
  }
  return(ad)
}
CreateDfAdAndOo <- function(oo, ad) {
  if (is.null(oo) & is.null(ad)) {
    return(NULL)
  }
  if (is.null(oo)) {
    df_oo <- data.frame(oo=NA)
  } else {
    df_oo <- as.data.frame(oo) |> setNames("oo")
  }
  res <- df_oo |> bind_cols(data.frame(ad=ad))
  return(res)  
}
GetAuthors <- function(tempNames) {
  if (is.null(tempNames)) {
    return(NULL)
  }
  if (tempNames$count == 1) {
    tempNames$name <- tempNames$name |> list()
  }
  nameAndAddrNo <- tempNames$name |> map_chr( ~ str_c(.$wos_standard, "[", .$addr_no, "]")) |> str_c(collapse = " | ")
  return(nameAndAddrNo)
}
CheckQueryNho <- function(uidAndAddresses) {
  uidAndAddresses$nho_flag <- FALSE
  for (i in 1:nrow(uidAndAddresses)) {
    if (any(str_detect(tolower(uidAndAddresses[i, "ad"]), facilityData$facilityNameLower))) {
      uidAndAddresses[i, "nho_flag"] <- TRUE
    } else {
      if (!is.na(uidAndAddresses[i, "oo"])) {
        if (any(str_detect(tolower(uidAndAddresses[i, "oo"]), facilityData$facilityNameLower))) {
          uidAndAddresses[i, "nho_flag"] <- TRUE
        }
      }
    }
  }
  return(uidAndAddresses)
}
ExecCheckTarget3 <- function() {
  # target内のuidがHTMLファイルに全て出力されているか確認する
  df_target <- targetUids |> unlist() |> unlist() |> as.data.frame() |> setNames("uid")
  # allPapersに出力されていないuidを取得
  nonOutputAllPapersTarget <- df_target |> anti_join(allPapers, by="uid") %>% .$uid
  uidAndAddresses <- nonOutputAllPapersTarget |> map( ~ {
    targetUid <- .
    address_names <- addresses[[targetUid]]$addresses
    if (address_names$count == 1) {
      address_names$address_name <- address_names$address_name |> list()
    }
    res <- address_names$address_name |> map( ~ {
      address_name <- .
      address_names <- address_name$names
      address_spec <- address_name$address_spec
      oo <- GetOoForCheckTarget3(address_spec)
      ad <- GetAdForCheckTarget3(address_spec)
      df_oo_ad <- CreateDfAdAndOo(oo, ad)
      if (!is.null(df_oo_ad)) {
        authors <- address_names |> GetAuthors()
        df_oo_ad$authors <- authors
      }
      return(df_oo_ad)
    }) |> discard( ~ is.null(.)) |> bind_rows()
    res$wos_id <- targetUid
    res$date_created <- rec[[targetUid]]$dates$date_created
    pmid <- rec[[targetUid]]$dynamic_data$cluster_related$identifiers$identifier |> map( ~ {
      if (.$type!="pmid") {
        return(NULL)
      } else {
        return(str_remove(.$value, "MEDLINE:"))
      }
    }) |> discard( ~ is.null(.)) |> list_c()
    res$pubmed_id <- pmid
    res$wos_url <- str_c("https://www.webofscience.com/wos/woscc/full-record/", targetUid)
    if (!is.null(pmid)) {
      res$pubmed_url <- str_c("https://pubmed.ncbi.nlm.nih.gov/", pmid, "/")
    } else {
      res$pubmed_url <- NA
    }
    return(res)
  }) |> bind_rows() |> select(c("wos_id", "ad", "oo", "authors", "date_created", "wos_url", "pubmed_url")) |> 
    arrange(desc(date_created), wos_id)
  # 明らかに対象外の施設を除外する
  uidAndAddresses <- uidAndAddresses |> 
    filter(!str_detect(ad, "Natl Ctr Child Hlth & Dev, Clin Res Ctr, Dept Data Sci, Tokyo, Japan")) |> 
    filter(!str_detect(ad, "Teikyo Univ, Chiba Med Ctr, Dept Surg, Chiba, Japan")) |> 
    filter(!str_detect(ad, "Kansai Med Univ, Div Gastroenterol & Hepatol, Med Ctr, Moriguchi, Osaka, Japan")) |> 
    filter(!str_detect(ad, "Okayama Red Cross Hosp, Kawasaki Med Sch, Dept Gen Internal Med 3, Gen Med Ctr, Okayama, Japan")) |> 
    filter(!str_detect(ad, "Ehime Univ, Shikoku Canc Ctr, Dept Cardiol, Dept Radiol,Grad Sch Med, Matsuyama, Ehime, Japan")) |> 
    filter(!str_detect(ad, "Toho Univ, Ohashi Med Ctr, Dept Cardiovasc Med, Tokyo, Japan")) |> 
    filter(!str_detect(ad, "Kindai Univ Hosp, Clin Res Ctr, Osaka, Japan")) |> 
    filter(!str_detect(ad, "Yokohama City Univ, Gastroenterol Ctr, Dept Surg, Med Ctr, Yokohama, Kanagawa, Japan")) |> 
    filter(!str_detect(ad, "Aichi Med Univ, Canc Ctr, Nagakute, Aichi, Japan")) |> 
    filter(!str_detect(ad, "Osaka Hosp, Japan Community Healthcare Org, Dept Internal Med, Osaka, Japan"))
  checkNho <- uidAndAddresses |> CheckQueryNho()
  wosDataError <- checkNho |> filter(is.na(authors) & nho_flag) |> select(-c("nho_flag"))
  facilityNameError <- checkNho |> anti_join(wosDataError, by="wos_id") |> select(-c("nho_flag"))
  return(list(facilityNameError=facilityNameError, wosDataError=wosDataError))
}
# ------ main ------
