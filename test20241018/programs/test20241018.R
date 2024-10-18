#' 
#' description
#' @file test20241018.R
#' @author Mariko Ohtsuka
#' @date 2024.10.18
rm(list=ls())
# ------ libraries ------
library(tidyverse)
library(here)
# ------ constants ------
kParentPath <- "Box\\Projects\\NHO 臨床研究支援部\\英文論文\\wos-tools\\result\\result_20240925100939\\"
krawJsonPath <- str_c(kParentPath, "raw\\raw.json")
kAllPapersJsonPath <- str_c(kParentPath, "raw\\all_papers.json")
# ------ functions ------
source(here("programs", "common_function.R"), encoding="UTF-8")
homeDir <- GetHomeDir()
source(here("programs", "getQuery.R"), encoding="UTF-8")
CheckFacilityName <- function(categoryText) {
  target <- uidAndfacilities |> filter(category == categoryText)
  facilityNames <- facilityData |> filter(category == categoryText) %>% .[ , "facilityNameLower", drop=T]
  nhoFacilities <- facilityNames |> map_df( ~ target |> filter(facility |> str_detect(.)) |> distinct())
  return(nhoFacilities)
}
ExcludeNho <- function(inputDf, categoryText) {
  targetCatFacility <- facilityData |> filter(category == categoryText)
  res <- inputDf |> anti_join(targetCatFacility, by=c("facility"="facilityNameLower")) |> 
    filter(!str_detect(facility, "^nho")) |> 
    filter(!str_detect(facility, "^natl hosp org ")) |> 
    filter(!str_detect(facility, "natl hosp org$")) |> 
    filter(!str_detect(facility, "natl hosp$"))
  return(res)
}
# ------ main ------
rec <- file.path(homeDir, krawJsonPath) |> GetRawData()
addresses <- rec |> GetAddresses()
uidAndAddressSpec <- addresses |> map( ~ {
  res <- .
  addresses <- .$addresses
  if (addresses$count == 1) {
    addressName <- list(addresses$address_name)
  } else {
    addressName <- addresses$address_name
  }
  addressSpec <- addressName |> map( ~ .$address_spec)
  res$addresses <- NULL
  res$addressSpec <- addressSpec
  return(res)
})
uidAndfacilities <- uidAndAddressSpec |> map_df( ~ {
  temp <- .
  uid <- temp$uid
  ad <- temp$addressSpec |> map_df( ~ c(uid=uid, facility=tolower(.$full_address), category="AD"))
  oo <- temp$addressSpec |> map( ~ {
    tempoo <- .$organizations$organization
    if (is.null(tempoo)) {
      return(NULL)
    }
    res <- tempoo |> map_df( ~ c(uid=uid, facility=tolower(.$content), category="OO"))
    return(res)
  })
  res <- ad |> bind_rows(oo)  
  return(res)
}) |> distinct()
nhoOo <- CheckFacilityName("OO")
nhoAd <- CheckFacilityName("AD")
ooFacilities <- nhoOo |> ExcludeNho("OO")
# NHO病院であることが明らかなものは削除
ooFacilities <- ooFacilities |> 
  filter(facility != "sendai med ctr") |> 
  filter(facility != "natl hlth org sendai nishitaga hosp") |> 
  filter(facility != "shibukawa med ctr") |> 
  filter(facility != "higashisaitama hosp") |> 
  filter(facility != "natl saitama hosp") |> 
  filter(facility != "shimofusa psychiat med ctr") |> 
  filter(facility != "natl tokyo med ctr") |> 
  filter(facility != "natl disaster med ctr") |> 
  filter(facility != "inst murayama med ctr") |> 
  filter(facility != "yokohama med ctr") |> 
  filter(facility != "natl hakone hosp") |> 
  filter(facility != "nishiniigata chuo hosp epilepsy ctr") |> 
  filter(facility != "matsumoto med ctr") |> 
  filter(facility != "shinshu ueda med ctr") |> 
  filter(facility != "shizuoka inst epilepsy & neurol disorders") |> 
  filter(facility != "shizuoka inst epilepsy & neurol disorder") |> 
  filter(facility != "nationial hosp org nagoya med ctr") |> 
  filter(facility != "shizuoka inst epilepsy & neurol disorder") |> 
  filter(facility != "kyoto med ctr") |> 
  filter(facility != "maizuru med ctr") |>  
  filter(facility != "natl toneyama med ctr") |> 
  filter(facility != "osaka toneyama med ctr") |> 
  filter(facility != "osaka minami med ctr") |> 
  filter(facility != "kobe med ctr") |> 
  filter(facility != "himeji med ctr") |> 
  filter(facility != "natl hlth org hamada med ctr") |> 
  filter(facility != "natl okayama med ctr") |> 
  filter(facility != "natl org kure med ctr") |> 
  filter(facility != "natl org fukuyama med ctr") |> 
  filter(facility != "nar hosp org kanmon med ctr") |> 
  filter(facility != "shikoku med ctr children & adults kagawa") |> 
  filter(facility != "shikoku canc ctr hosp") |> 
  filter(facility != "natl hosp organizat shikoku canc ctr") |> 
  filter(facility != "kyushu canc ctr") |> 
  filter(facility != "natl kyushu canc ctr") |> 
  filter(facility != "kyushu med ctr") |> 
  filter(facility != "natl kyushu med ctr") |> 
  filter(facility != "kumamoto med ctr") |> 
  filter(facility != "murayama med ctr nho")
ooText <- ooFacilities %>% select("facility") |> distinct()
oo <- ooText[ , 1, drop=T] |> map_df( ~ {
  temp <- filter(nhoOo, facility == .)
  count <- nrow(temp)
  return(c("facility"=., count=count))
})
write.csv(oo, here("oo.csv"))

adFacilities <- nhoAd |>
  filter(!str_detect(facility, "nho ")) |>  
  filter(!str_detect(facility, "nho, ")) |> 
  filter(!str_detect(facility, "natl hosp org ")) |> 
  filter(!str_detect(facility, "natl hosp org, "))
