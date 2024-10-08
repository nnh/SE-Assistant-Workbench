#' Get facility information for wos-tools
#' 
#' @file getQuery.R
#' @author Mariko Ohtsuka
#' @date 2024.10.7
# ------ libraries ------
library(V8)
ct <- v8()
# ------ constants ------
kNhoFacilityNumberStr = "const nhoFacilityNumber = "
kFacilityQueriesStr = "const facilityQueries:"
kFacilityNameJaStr = "const facilityNameJa "
# ------ functions ------
GetQuery <- function() {
  queryScript <- homeDir |> file.path("Documents\\GitHub\\wos-tools\\example\\src", "query.ts") |> readLines()
  facilityNameJaStrStart <- NA
  facilityNameJaStrEnd <- NA
  facilityQueriesStrStart <- NA
  facilityQueriesStrEnd <- NA
  for (i in 1:length(queryScript)) {
    if (str_detect(queryScript[i], kNhoFacilityNumberStr)) {
      nhoFacilityNumber <- queryScript[i] |> str_remove(kNhoFacilityNumberStr) |> str_remove(";") |> trimws()
    }
    if (str_detect(queryScript[i], kFacilityNameJaStr)) {
      facilityNameJaStrStart <- i + 1
    }
    if (!is.na(facilityNameJaStrStart) & is.na(facilityNameJaStrEnd) & str_detect(queryScript[i], "\\};")) {
      facilityNameJaStrEnd <- i - 1
    }
    if (str_detect(queryScript[i], kFacilityQueriesStr)) {
      facilityQueriesStrStart <- i + 1
    }
    if (!is.na(facilityQueriesStrStart) & is.na(facilityQueriesStrEnd) & str_detect(queryScript[i], "^\\];")) {
      facilityQueriesStrEnd <- i - 1
    }
    
  }
  if (
    !exists("nhoFacilityNumber") | 
    is.na(facilityNameJaStrStart) | 
    is.na(facilityNameJaStrEnd) | 
    is.na(facilityQueriesStrStart) | 
    is.na(facilityQueriesStrEnd)
  ) {
    stop("")
  }
  facilityIdAndName <- queryScript[facilityNameJaStrStart:facilityNameJaStrEnd] |> 
    str_replace("\\[nhoFacilityNumber\\]", nhoFacilityNumber) |> tibble() |>
    separate(1, into=c("facilityNumber", "name"), sep = ":") |> mutate_all( ~ str_trim(.))
  facilityIdAndName$facilityNumber <- facilityIdAndName$facilityNumber |> as.numeric()
  facilityIdAndName$name <- facilityIdAndName$name |> str_remove_all('"') |> str_remove_all(',')
  
  facilityOOAndAD <- queryScript[facilityQueriesStrStart:facilityQueriesStrEnd] |> trimws() |> str_c(collapse="") |>
    str_replace_all("OO:", '"OO":') |>
    str_replace_all("AD:", '"AD":') |>
    str_replace_all("facilityNumber:", '"facilityNumber":') |>
    str_replace_all("exclude", '"exclude"') |> 
    str_replace_all(",\\]", "\\]") |> 
    str_replace_all(",\\}", "\\}") |> 
    str_replace_all("nhoFacilityNumber", nhoFacilityNumber)
  
  facilityOOAndADList <- facilityOOAndAD |> str_split("\\},") |> list_c() |> str_c("}") |> 
    str_replace("\\}\\}", "\\}") |> str_replace_all('\\"and\\"', 'and') |> str_replace_all("'", '"')
  for (i in length(facilityOOAndADList):2) {
    if (str_sub(facilityOOAndADList[i], 1, 6) != '{\"OO\":') {
      facilityOOAndADList[i - 1] <- str_c(facilityOOAndADList[i - 1], ", ", facilityOOAndADList[i])
      facilityOOAndADList[i] <- NA
    }
  }
  facilityOOAndADList <- facilityOOAndADList |> na.omit()
  facilityNumberAndOOAndAD <- facilityOOAndADList |> map( ~ {
    json <- fromJSON(.)
    ad <- json$AD %>% map_chr( ~ str_c(., collapse = "|")) %>% data.frame(category="AD", facilityName=.)
    oo <- json$OO %>% data.frame(category="OO", facilityName=.)
    res <- ad |> bind_rows(oo)
    res$facilityNumber <- json$facilityNumber
    return(res)
  }) |> bind_rows()
  facilityData <- facilityNumberAndOOAndAD |> left_join(facilityIdAndName, by="facilityNumber")
  facilityData$facilityNameLower <- facilityData$facilityName |> tolower()
  return(facilityData)
}
# ------ main ------
facilityData <- GetQuery()